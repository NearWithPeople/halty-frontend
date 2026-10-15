import './styles.css';
import React, { useState } from 'react';
import { Key, Check, X, ExternalLink, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { DEFAULT_MAPBOX_TOKEN } from '../../services/mapbox';

interface TokenModalProps {
  currentToken: string;
  onSaveToken: (token: string) => void;
  onClose: () => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({
  currentToken,
  onSaveToken,
  onClose,
}) => {
  const [tokenInput, setTokenInput] = useState(
    currentToken === DEFAULT_MAPBOX_TOKEN ? '' : currentToken
  );
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(tokenInput.trim() || DEFAULT_MAPBOX_TOKEN);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 1000);
  };

  const handleResetDefault = () => {
    setTokenInput('');
    onSaveToken(DEFAULT_MAPBOX_TOKEN);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 1000);
  };

  const isUsingCustom = currentToken && currentToken !== DEFAULT_MAPBOX_TOKEN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Mapbox Access Token</h3>
              <p className="text-xs text-slate-500">Настройки ключа доступа API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-blue-50/80 border border-blue-100 text-xs text-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {isUsingCustom
                ? 'Используется ваш персональный ключ Mapbox'
                : 'Используется публичный демонстрационный токен Mapbox'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Публичный токен (pk.eyJ...)
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSI..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Как получить свой бесплатный токен:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed text-[11px]">
              <li>Зарегистрируйтесь бесплатно на сайте mapbox.com</li>
              <li>Перейдите в раздел Account &rarr; Access Tokens</li>
              <li>Скопируйте Default public token и вставьте сюда</li>
            </ol>
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline pt-1"
            >
              <span>Открыть страницу токенов Mapbox</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Сбросить токен</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {isSavedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Сохранено!</span>
                  </>
                ) : (
                  <span>Сохранить</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
