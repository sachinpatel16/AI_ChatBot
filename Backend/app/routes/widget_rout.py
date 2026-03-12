from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, Response

from app import models
from app.schemas import WidgetConfigResponse
from app.response import success_response, MSG_FETCHED
from app.dependencies import verify_widget_access

router = APIRouter(prefix="/widget", tags=["Widget — Public Embed"])


@router.get("/config")
async def get_public_widget_config(config: models.WidgetConfig = Depends(verify_widget_access)):
    """Public endpoint: returns widget appearance config for the embed script."""
    return success_response(
        data=WidgetConfigResponse.model_validate(config).model_dump(),
        message=MSG_FETCHED,
    )


@router.get("/widget.js")
async def serve_widget_js(config: models.WidgetConfig = Depends(verify_widget_access)):
    """
    Public endpoint: serves the self-contained chat widget JavaScript.
    Website owners embed the bot by adding one script tag:
        <script src="https://your-api.com/widget/widget.js?token=xyz" async></script>
    """
    quick_replies_json = str(config.quick_replies).replace("'", '"')

    js_code = f"""
(function () {{
  var WIDGET_CONFIG = {{
    botName: {repr(config.bot_name)},
    welcomeMessage: {repr(config.welcome_message)},
    primaryColor: {repr(config.primary_color)},
    buttonPosition: {repr(config.button_position)},
    quickReplies: {quick_replies_json},
    apiBase: (function() {{
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {{
        var src = scripts[i].src;
        if (src && src.indexOf('/widget/widget.js') !== -1) {{
          return src.substring(0, src.indexOf('/widget/widget.js'));
        }}
      }}
      return '';
    }})()
  }};

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#qr-widget-btn {{',
    '  position: fixed;',
    '  width: 56px; height: 56px;',
    '  border-radius: 50%;',
    '  background: ' + WIDGET_CONFIG.primaryColor + ';',
    '  border: none; cursor: pointer;',
    '  box-shadow: 0 4px 16px rgba(0,0,0,0.25);',
    '  display: flex; align-items: center; justify-content: center;',
    '  z-index: 999998; transition: transform 0.2s, box-shadow 0.2s;',
    '  ' + (WIDGET_CONFIG.buttonPosition === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'),
    '  bottom: 24px;',
    '}}',
    '#qr-widget-btn:hover {{ transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }}',
    '#qr-widget-btn svg {{ width: 28px; height: 28px; fill: #fff; }}',

    '#qr-widget-panel {{',
    '  position: fixed; bottom: 92px;',
    '  ' + (WIDGET_CONFIG.buttonPosition === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'),
    '  width: 360px; max-width: calc(100vw - 32px);',
    '  height: 520px; max-height: calc(100vh - 120px);',
    '  background: #fff; border-radius: 18px;',
    '  box-shadow: 0 8px 40px rgba(0,0,0,0.18);',
    '  display: flex; flex-direction: column;',
    '  z-index: 999999; overflow: hidden;',
    '  transform: scale(0.85) translateY(20px);',
    '  opacity: 0; pointer-events: none;',
    '  transition: transform 0.25s cubic-bezier(.4,0,.2,1), opacity 0.25s;',
    '  resize: both;',
    '  min-width: 280px; min-height: 380px;',
    '}}',
    '#qr-widget-panel.qr-open {{',
    '  transform: scale(1) translateY(0);',
    '  opacity: 1; pointer-events: all;',
    '}}',

    '#qr-widget-header {{',
    '  background: ' + WIDGET_CONFIG.primaryColor + ';',
    '  color: #fff; padding: 14px 16px;',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  border-radius: 18px 18px 0 0;',
    '  cursor: move; user-select: none;',
    '}}',
    '#qr-widget-header h3 {{ margin: 0; font-size: 16px; font-weight: 700; font-family: sans-serif; }}',
    '#qr-widget-close {{',
    '  background: none; border: none; cursor: pointer;',
    '  color: rgba(255,255,255,0.85); font-size: 22px; line-height: 1;',
    '  padding: 0 2px; display: flex; align-items: center;',
    '}}',
    '#qr-widget-close:hover {{ color: #fff; }}',

    '#qr-widget-messages {{',
    '  flex: 1; overflow-y: auto; padding: 16px 12px;',
    '  display: flex; flex-direction: column; gap: 10px;',
    '  font-family: sans-serif;',
    '  scrollbar-width: thin; scrollbar-color: #ddd transparent;',
    '}}',

    '.qr-msg {{ display: flex; align-items: flex-end; gap: 8px; }}',
    '.qr-msg.qr-bot {{ flex-direction: row; }}',
    '.qr-msg.qr-user {{ flex-direction: row-reverse; }}',

    '.qr-avatar {{',
    '  width: 32px; height: 32px; border-radius: 50%;',
    '  background: #e5e7eb; display: flex; align-items: center;',
    '  justify-content: center; flex-shrink: 0; font-size: 16px;',
    '}}',

    '.qr-bubble {{',
    '  max-width: 75%; padding: 10px 14px;',
    '  border-radius: 16px; font-size: 14px; line-height: 1.5;',
    '  word-break: break-word;',
    '}}',
    '.qr-msg.qr-bot .qr-bubble {{',
    '  background: ' + WIDGET_CONFIG.primaryColor + ';',
    '  color: #fff; border-bottom-left-radius: 4px;',
    '}}',
    '.qr-msg.qr-user .qr-bubble {{',
    '  background: #f3f4f6; color: #111;',
    '  border-bottom-right-radius: 4px;',
    '}}',

    '#qr-quick-replies {{',
    '  display: flex; flex-wrap: wrap; gap: 8px;',
    '  padding: 0 12px 10px; font-family: sans-serif;',
    '}}',
    '.qr-chip {{',
    '  padding: 7px 14px; border-radius: 20px; font-size: 13px; cursor: pointer;',
    '  border: 1.5px solid ' + WIDGET_CONFIG.primaryColor + ';',
    '  color: ' + WIDGET_CONFIG.primaryColor + ';',
    '  background: #fff; transition: background 0.15s, color 0.15s;',
    '  white-space: nowrap;',
    '}}',
    '.qr-chip:hover {{ background: ' + WIDGET_CONFIG.primaryColor + '; color: #fff; }}',

    '#qr-widget-input-row {{',
    '  display: flex; align-items: center; gap: 8px;',
    '  border-top: 1px solid #e5e7eb; padding: 10px 12px;',
    '}}',
    '#qr-widget-input {{',
    '  flex: 1; border: none; outline: none;',
    '  font-size: 14px; font-family: sans-serif;',
    '  padding: 6px 4px; background: transparent; color: #111;',
    '}}',
    '#qr-widget-input::placeholder {{ color: #9ca3af; }}',
    '#qr-widget-send {{',
    '  width: 36px; height: 36px; border-radius: 50%;',
    '  background: ' + WIDGET_CONFIG.primaryColor + ';',
    '  border: none; cursor: pointer; display: flex;',
    '  align-items: center; justify-content: center;',
    '  transition: opacity 0.2s;',
    '}}',
    '#qr-widget-send:hover {{ opacity: 0.85; }}',
    '#qr-widget-send svg {{ width: 18px; height: 18px; fill: #fff; }}',

    '.qr-typing {{ display: flex; gap: 4px; padding: 4px 2px; align-items: center; }}',
    '.qr-dot {{',
    '  width: 7px; height: 7px; border-radius: 50%;',
    '  background: rgba(255,255,255,0.7);',
    '  animation: qrBounce 1.2s infinite;',
    '}}',
    '.qr-dot:nth-child(2) {{ animation-delay: 0.2s; }}',
    '.qr-dot:nth-child(3) {{ animation-delay: 0.4s; }}',
    '@keyframes qrBounce {{',
    '  0%, 80%, 100% {{ transform: translateY(0); }}',
    '  40% {{ transform: translateY(-6px); }}',
    '}}',
    '@media (max-width: 480px) {{',
    '  #qr-widget-panel {{',
    '    width: 100% !important; max-width: 100% !important;',
    '    height: 100% !important; max-height: 100% !important;',
    '    bottom: 0 !important; left: 0 !important; right: 0 !important; top: 0 !important;',
    '    border-radius: 0;',
    '  }}',
    '  #qr-widget-header {{ border-radius: 0; padding: 16px; }}',
    '  #qr-widget-btn {{',
    '    ' + (WIDGET_CONFIG.buttonPosition === 'bottom-left' ? 'left: 16px !important;' : 'right: 16px !important;'),
    '    bottom: 16px !important;',
    '  }}',
    '}}'
  ].join('\\n');
  document.head.appendChild(style);

  // ── Build DOM ───────────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'qr-widget-btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.id = 'qr-widget-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', WIDGET_CONFIG.botName);
  panel.innerHTML =
    '<div id="qr-widget-header">' +
      '<h3>' + WIDGET_CONFIG.botName + '</h3>' +
      '<button id="qr-widget-close" aria-label="Close chat">&#x2715;</button>' +
    '</div>' +
    '<div id="qr-widget-messages"></div>' +
    '<div id="qr-quick-replies"></div>' +
    '<div id="qr-widget-input-row">' +
      '<input id="qr-widget-input" type="text" placeholder="Type here and press enter.." autocomplete="off" />' +
      '<button id="qr-widget-send" aria-label="Send">' +
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
      '</button>' +
    '</div>';
  document.body.appendChild(panel);

  var messagesEl = document.getElementById('qr-widget-messages');
  var quickRepliesEl = document.getElementById('qr-quick-replies');
  var inputEl = document.getElementById('qr-widget-input');

  // ── Drag to Move ─────────────────────────────────────────────────────────────
  var header = document.getElementById('qr-widget-header');
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  header.onmousedown = dragMouseDown;
  header.ontouchstart = dragTouchStart;

  function dragMouseDown(e) {{
    if (e.target.id === 'qr-widget-close') return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    prepareDrag();
  }}

  function dragTouchStart(e) {{
    if (e.target.id === 'qr-widget-close') return;
    pos3 = e.touches[0].clientX;
    pos4 = e.touches[0].clientY;
    document.ontouchend = closeDragElement;
    document.ontouchmove = elementTouchDrag;
    prepareDrag();
  }}

  function prepareDrag() {{
    var rect = panel.getBoundingClientRect();
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.transition = 'none';
    panel.style.transform = 'none';
  }}

  function elementDrag(e) {{
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    panel.style.top = (panel.offsetTop - pos2) + 'px';
    panel.style.left = (panel.offsetLeft - pos1) + 'px';
  }}

  function elementTouchDrag(e) {{
    pos1 = pos3 - e.touches[0].clientX;
    pos2 = pos4 - e.touches[0].clientY;
    pos3 = e.touches[0].clientX;
    pos4 = e.touches[0].clientY;
    panel.style.top = (panel.offsetTop - pos2) + 'px';
    panel.style.left = (panel.offsetLeft - pos1) + 'px';
  }}

  function closeDragElement() {{
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;
    panel.style.transition = 'opacity 0.25s';
  }}

  // ── State ────────────────────────────────────────────────────────────────────
  var isOpen = false;
  var quickRepliesShown = true;

  // ── Toggle ───────────────────────────────────────────────────────────────────
  function openPanel() {{
    isOpen = true;
    panel.classList.add('qr-open');
    btn.setAttribute('aria-expanded', 'true');
    inputEl.focus();
  }}

  function closePanel() {{
    isOpen = false;
    panel.classList.remove('qr-open');
    btn.setAttribute('aria-expanded', 'false');
  }}

  btn.addEventListener('click', function () {{ isOpen ? closePanel() : openPanel(); }});
  document.getElementById('qr-widget-close').addEventListener('click', closePanel);

  // ── Markdown Parser ──────────────────────────────────────────────────────────
  function escapeHTML(str) {{
      return (str || '').replace(/[&<>'"]/g, function(tag) {{
          var charsToReplace = {{ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }};
          return charsToReplace[tag] || tag;
      }});
  }}

  function parseMarkdown(text) {{
    var html = escapeHTML(text);
    
    // Code blocks
    html = html.replace(/```([\\s\\S]*?)```/g, function(match, p1) {{
        return '<pre style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 12px; margin: 4px 0;"><code>' + p1 + '</code></pre>';
    }});
    html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');
    
    // Headers
    html = html.replace(/^### (.*$)/gm, '<strong style="font-size: 1.1em; display:block; margin-top:8px;">$1</strong>');
    html = html.replace(/^## (.*$)/gm, '<strong style="font-size: 1.2em; display:block; margin-top:8px;">$1</strong>');
    html = html.replace(/^# (.*$)/gm, '<strong style="font-size: 1.3em; display:block; margin-top:8px;">$1</strong>');
    
    // Bold & Italic
    html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    html = html.replace(/\\*([^\\*]+)\\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Bullet points & Numbered lists
    html = html.replace(/^[\\s]*[-*]\\s+(.*)$/gm, '<div style="display:flex; margin-bottom:4px;"><span style="margin-right:6px;">•</span><span>$1</span></div>');
    html = html.replace(/^[\\s]*(\\d+)\\.\\s+(.*)$/gm, '<div style="display:flex; margin-bottom:4px;"><span style="margin-right:6px;">$1.</span><span>$2</span></div>');
    
    // Links
    html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>');
    
    // Line breaks
    html = html.replace(/\\n\\n/g, '<br><br>');
    html = html.replace(/\\n/g, '<br>');

    // Cleanup extra breaks around block elements
    html = html.replace(/<\\/div><br>/g, '</div>');
    html = html.replace(/<\\/pre><br>/g, '</pre>');
    html = html.replace(/<\\/strong><br>/g, '</strong>');

    return html;
  }}

  // ── Messages ─────────────────────────────────────────────────────────────────
  function addMessage(text, role) {{
    var wrap = document.createElement('div');
    wrap.className = 'qr-msg qr-' + role;

    if (role === 'bot') {{
      var av = document.createElement('div');
      av.className = 'qr-avatar';
      av.textContent = '\\uD83E\\uDD16';
      wrap.appendChild(av);
    }}

    var bubble = document.createElement('div');
    bubble.className = 'qr-bubble';
    
    if (role === 'bot') {{
      bubble.innerHTML = parseMarkdown(text);
    }} else {{
      bubble.textContent = text;
    }}
    
    wrap.appendChild(bubble);

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }}

  function addTypingIndicator() {{
    var wrap = document.createElement('div');
    wrap.className = 'qr-msg qr-bot';
    wrap.id = 'qr-typing';

    var av = document.createElement('div');
    av.className = 'qr-avatar';
    av.textContent = '\\uD83E\\uDD16';
    wrap.appendChild(av);

    var bubble = document.createElement('div');
    bubble.className = 'qr-bubble';
    bubble.innerHTML = '<div class="qr-typing"><div class="qr-dot"></div><div class="qr-dot"></div><div class="qr-dot"></div></div>';
    wrap.appendChild(bubble);

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }}

  function removeTypingIndicator() {{
    var el = document.getElementById('qr-typing');
    if (el) el.parentNode.removeChild(el);
  }}

  // ── Quick replies ─────────────────────────────────────────────────────────────
  function showQuickReplies() {{
    quickRepliesEl.innerHTML = '';
    WIDGET_CONFIG.quickReplies.forEach(function (label) {{
      var chip = document.createElement('button');
      chip.className = 'qr-chip';
      chip.textContent = label;
      chip.addEventListener('click', function () {{
        hideQuickReplies();
        sendMessage(label);
      }});
      quickRepliesEl.appendChild(chip);
    }});
    quickRepliesShown = true;
  }}

  function hideQuickReplies() {{
    quickRepliesEl.innerHTML = '';
    quickRepliesShown = false;
  }}

  // ── Send message ──────────────────────────────────────────────────────────────
  function sendMessage(text) {{
    if (!text.trim()) return;
    if (quickRepliesShown) hideQuickReplies();

    addMessage(text, 'user');
    inputEl.value = '';
    inputEl.disabled = true;

    var typingEl = addTypingIndicator();

    var url = WIDGET_CONFIG.apiBase + '/chat/public?query=' + encodeURIComponent(text) + '&token=' + encodeURIComponent(new URLSearchParams(window.location.search).get('token') || (function(){{
        var scs = document.getElementsByTagName('script');
        for(var i=0; i<scs.length; i++) {{
            if(scs[i].src && scs[i].src.indexOf('token=') !== -1) {{
                return new URL(scs[i].src).searchParams.get('token');
            }}
        }}
        return '';
    }})());
    fetch(url, {{ method: 'POST' }})
      .then(function (res) {{ return res.json(); }})
      .then(function (json) {{
        removeTypingIndicator();
        var reply = 'Sorry, I could not get a response.';
        if (json && json.success && json.data && json.data.response) {{
            reply = json.data.response;
        }} else if (json && json.response) {{
            reply = json.response;
        }}
        addMessage(reply, 'bot');
        inputEl.disabled = false;
        inputEl.focus();
      }})
      .catch(function () {{
        removeTypingIndicator();
        addMessage('Sorry, something went wrong. Please try again.', 'bot');
        inputEl.disabled = false;
      }});
  }}

  document.getElementById('qr-widget-send').addEventListener('click', function () {{
    sendMessage(inputEl.value);
  }});

  inputEl.addEventListener('keydown', function (e) {{
    if (e.key === 'Enter') sendMessage(inputEl.value);
  }});

  // ── Welcome message on first open ─────────────────────────────────────────────
  var welcomed = false;
  btn.addEventListener('click', function () {{
    if (!welcomed && isOpen) {{
      welcomed = true;
      addMessage(WIDGET_CONFIG.welcomeMessage, 'bot');
      showQuickReplies();
    }}
  }});
}})();
"""

    return Response(
        content=js_code.strip(),
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )
