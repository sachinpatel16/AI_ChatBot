import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, MessageSquare, FileText } from 'lucide-react';
import { apiService } from '../../services/api';
import { ChatMessage } from '../../types';
import MarkdownText from '../MarkdownText';

const ChatbotPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastDocsUsed, setLastDocsUsed] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const newMsgs = [...messages, userMessage];
    setMessages(newMsgs);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await apiService.adminTestChat(inputMessage);

      if (response.documents_searched?.length > 0) {
        setLastDocsUsed(response.documents_searched);
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        tool_used: response.documents_searched,
      };

      const finalMsgs = [...newMsgs, botMessage];
      setMessages(finalMsgs);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
      const errorMsgs = [...newMsgs, errorMessage];
      setMessages(errorMsgs);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = async () => {
    const userChoice = window.confirm(
      "Are you sure you want to clear the chat?\n\n" +
      "OK = Clear UI\n" +
      "Cancel = Cancel operation"
    );

    if (userChoice) {
      try {
        setMessages([]);
        alert(`✅ Chat cleared successfully.`);
      } catch (error) {
        console.error('Failed to clear chat data:', error);
        alert('❌ Failed to clear chat data.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20 dark:border-gray-700/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Company Assistant</h1>
            <p className="text-gray-600 dark:text-gray-300">Ask questions from your uploaded and processed documents</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 flex flex-col h-[600px]">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">Ask a question</p>
                <p className="text-sm mt-1 max-w-xs mx-auto">
                  Activate documents in the <span className="font-semibold text-blue-500">Documents</span> page, then ask anything from them.
                </p>
                {lastDocsUsed.length > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                    {lastDocsUsed.map(name => (
                      <span key={name} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
                        <FileText className="h-2.5 w-2.5" />{name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${message.sender === 'user'
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.sender === 'assistant' && (
                      <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    )}
                    {message.sender === 'user' && (
                      <User className="h-5 w-5 text-blue-100 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      {message.sender === 'assistant' ? (
                        <MarkdownText content={message.content} className="text-sm" />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      {/* Docs used badge */}
                      {message.sender === 'assistant' && Array.isArray(message.tool_used) && message.tool_used.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          {message.tool_used.map((name) => (
                            <span key={name} className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                              <FileText className="h-2 w-2" />{name}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;

