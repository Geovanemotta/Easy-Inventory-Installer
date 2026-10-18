import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { DeviceListItem } from '@/types/device';
import { useAuth } from '@/context/AuthContext';
import {
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Power,
  KeyRound,
  Shield,
  Server,
} from 'lucide-react';

interface SshTerminalModalProps {
  device: DeviceListItem;
  onClose: () => void;
  standalone?: boolean;
}

export function openSshStandalonePopup(device: DeviceListItem): boolean {
  try {
    localStorage.setItem(`terminal_device_${device.id}`, JSON.stringify(device));
  } catch {}

  const w = 1040;
  const h = 680;
  const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2));
  const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`;

  const url = `${window.location.origin}${window.location.pathname}#terminal?id=${device.id}`;
  const win = window.open(url, `ssh_term_${device.id}`, features);
  if (win) {
    win.focus();
    return true;
  }
  return false;
}

export const SshTerminalModal: React.FC<SshTerminalModalProps> = ({
  device,
  onClose,
  standalone = false,
}) => {
  const { user } = useAuth();
  const token = localStorage.getItem('access_token') || '';

  const defaultUser = user?.username || 'suporte';
  const hasAdSession = Boolean(user?.has_ad_session);

  const [username, setUsername] = useState(defaultUser);
  const [password, setPassword] = useState('');
  const [useSessionCred, setUseSessionCred] = useState(hasAdSession);
  const [port, setPort] = useState(22);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Inicializa o xterm
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#090d16',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#1e293b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {}
    }, 100);

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[36m============================================================\x1b[0m');
    term.writeln(`\x1b[1;37mTERMINAL REMOTO SSH - ${device.hostname}\x1b[0m`);
    term.writeln(`\x1b[90mDestino: ${device.ip || 'Sem IP'} | SO: ${device.sistema || 'Linux'}\x1b[0m`);
    term.writeln('\x1b[36m============================================================\x1b[0m');
    term.writeln('Informe as credenciais e clique em \x1b[32m[Conectar]\x1b[0m.\r\n');

    const onDataDisposable = term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
    });

    const handleResize = () => {
      if (fitAddonRef.current && termInstanceRef.current) {
        try {
          fitAddonRef.current.fit();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                action: 'resize',
                cols: termInstanceRef.current.cols,
                rows: termInstanceRef.current.rows,
              })
            );
          }
        } catch {}
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      onDataDisposable.dispose();
      if (wsRef.current) {
        wsRef.current.close();
      }
      term.dispose();
    };
  }, [device.hostname, device.ip, device.sistema]);

  // Redimensiona ao maximizar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fitAddonRef.current && termInstanceRef.current) {
        try {
          fitAddonRef.current.fit();
          termInstanceRef.current.focus();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                action: 'resize',
                cols: termInstanceRef.current.cols,
                rows: termInstanceRef.current.rows,
              })
            );
          }
        } catch {}
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isMaximized]);

  const handleConnect = () => {
    if (!device.id || !device.ip) return;
    const term = termInstanceRef.current;
    if (!term) return;

    setIsConnecting(true);
    setStatusMessage('Estabelecendo túnel...');

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${proto}//${host}/api/v1/terminal/ssh/${device.id}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const cols = term.cols || 80;
      const rows = term.rows || 24;

      ws.send(
        JSON.stringify({
          action: 'connect',
          username,
          password: useSessionCred ? undefined : (password || undefined),
          use_session_cred: useSessionCred,
          port: Number(port) || 22,
          cols,
          rows,
        })
      );

      setIsConnected(true);
      setIsConnecting(false);
      setStatusMessage('Conectado');
      term.focus();
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        const text = await event.data.text();
        term.write(text);
      } else if (typeof event.data === 'string') {
        if (event.data.includes('"action":"pong"')) return;
        term.write(event.data);
      }
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31;1m[ERRO WEBSOCKET]\x1b[0m Falha na comunicação com o backend.');
      setIsConnected(false);
      setIsConnecting(false);
      setStatusMessage('Erro');
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[33m[Sessão SSH finalizada]\x1b[0m\r\n');
      setIsConnected(false);
      setIsConnecting(false);
      setStatusMessage('Desconectado');
    };
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setStatusMessage('Desconectado');
  };

  const modalContent = (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-700 shadow-2xl transition-all duration-200 overflow-hidden ${
        isMaximized
          ? 'fixed inset-2 z-50 rounded-xl'
          : standalone
          ? 'h-screen w-screen'
          : 'w-full max-w-5xl h-[85vh] rounded-2xl'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 select-none">
        <div className="flex items-center gap-3">
          <TerminalIcon className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 tracking-wide">
            TERMINAL SSH
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-medium text-slate-300">
            {device.hostname}
          </span>
          <span className="rounded bg-slate-800/80 px-2 py-0.5 text-xs font-mono text-slate-400">
            {device.ip || 'Sem IP'}
          </span>

          {isConnected && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Ativo
            </span>
          )}
          {isConnecting && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" /> Conectando...
            </span>
          )}
          {!isConnected && !isConnecting && statusMessage && (
            <span className="text-xs text-slate-500">⚪ {statusMessage}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          {!standalone && (
            <button
              type="button"
              onClick={() => {
                handleDisconnect();
                openSshStandalonePopup(device);
                onClose();
              }}
              title="Destacar para janela popup"
              className="rounded p-1.5 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMaximized((prev) => !prev)}
            title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
            className="rounded p-1.5 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              handleDisconnect();
              onClose();
            }}
            title="Fechar terminal"
            className="rounded p-1.5 hover:bg-rose-900/60 hover:text-rose-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Credenciais e Barra de Conexão */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-slate-400" />
          <label className="text-slate-400">Usuário:</label>
          <input
            type="text"
            value={username}
            disabled={isConnected || isConnecting}
            onChange={(e) => {
              setUsername(e.target.value);
              if (hasAdSession && e.target.value !== user?.username) {
                setUseSessionCred(false);
              }
            }}
            placeholder="ex: suporte"
            className="w-28 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5 text-slate-400" />
          <label className="text-slate-400">Senha:</label>
          {useSessionCred ? (
            <input
              type="text"
              value="••••••••••••"
              disabled
              title="Usando a sessão segura do Active Directory"
              className="w-36 rounded border border-emerald-500/40 bg-emerald-950/20 px-2 py-1 font-mono text-emerald-400 cursor-default"
            />
          ) : (
            <input
              type="password"
              value={password}
              disabled={isConnected || isConnecting}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha SSH"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isConnected && !isConnecting) {
                  handleConnect();
                }
              }}
              className="w-36 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
          )}
        </div>

        {hasAdSession && (
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={useSessionCred}
              disabled={isConnected || isConnecting}
              onChange={(e) => {
                const check = e.target.checked;
                setUseSessionCred(check);
                if (check && user?.username) {
                  setUsername(user.username);
                }
              }}
              className="rounded border-slate-700 text-blue-600 focus:ring-0"
            />
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <Shield className="h-3 w-3" /> Sessão AD
            </span>
          </label>
        )}

        <div className="flex items-center gap-1.5">
          <label className="text-slate-400">Porta:</label>
          <input
            type="number"
            value={port}
            disabled={isConnected || isConnecting}
            onChange={(e) => setPort(Number(e.target.value))}
            className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting || !device.ip}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              <Power className="h-3.5 w-3.5" />
              <span>{isConnecting ? 'Conectando...' : 'Conectar'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 font-medium text-white hover:bg-rose-500 transition-colors"
            >
              <Power className="h-3.5 w-3.5" />
              <span>Desconectar</span>
            </button>
          )}
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={terminalRef}
        onClick={() => termInstanceRef.current?.focus()}
        className="flex-1 bg-[#090d16] p-2 overflow-hidden cursor-text"
      />

      {/* Rodapé informativo */}
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950 px-4 py-1.5 text-[11px] text-slate-500 font-mono">
        <span>Dica: Use <code>su &lt;usuario&gt;</code> para elevar privilégios.</span>
        <span>Ctrl+C ou <code>exit</code> para encerrar.</span>
      </div>
    </div>
  );

  if (standalone) {
    return modalContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      {modalContent}
    </div>
  );
};
