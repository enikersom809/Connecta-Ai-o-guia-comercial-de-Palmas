import React, { useState } from 'react';
import { X, Building2, MapPin, DollarSign, MessageCircle, Briefcase, FileText, Mail, Check, Copy } from 'lucide-react';
import { JobOffer } from '../types';

interface JobModalProps {
  job: JobOffer | null;
  onClose: () => void;
}

export const JobModal: React.FC<JobModalProps> = ({ job, onClose }) => {
  if (!job) return null;

  const [copiedEmail, setCopiedEmail] = useState(false);

  const hasWhatsApp = Boolean(
    job.linkContato &&
      (job.linkContato.includes('wa.me') ||
        job.linkContato.includes('whatsapp') ||
        job.linkContato.startsWith('http') ||
        job.linkContato.startsWith('55'))
  );

  const hasEmail = Boolean(job.emailContato || (job.linkContato && job.linkContato.startsWith('mailto:')));
  const emailAddress = job.emailContato || (job.linkContato.startsWith('mailto:') ? job.linkContato.replace('mailto:', '') : '');

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (emailAddress) {
      navigator.clipboard.writeText(emailAddress);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative border border-gray-100 dark:border-gray-800 transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded uppercase tracking-wide">
              Oportunidade Aberta
            </span>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1 leading-snug">{job.nome}</h3>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{job.empresa}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
          <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1.5 bg-gray-50 dark:bg-gray-800/70 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <p className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong className="text-gray-900 dark:text-white">Local:</strong> {job.local}
              </span>
            </p>
            <p className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong className="text-gray-900 dark:text-white">Salário:</strong> {job.salario}
              </span>
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Descrição da Vaga</span>
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50/80 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 whitespace-pre-line">
              {job.descricao}
            </p>
          </div>

          {job.requisitos && (
            <div>
              <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Requisitos & Qualificações</span>
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50/80 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 whitespace-pre-line">
                {job.requisitos}
              </p>
            </div>
          )}
        </div>

        {/* Botões de Ação para Envio de Currículo / Contato */}
        <div className="space-y-2 pt-1">
          {hasWhatsApp && (
            <a
              href={job.linkContato}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm p-3 rounded-xl text-center flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Candidatar-se via WhatsApp</span>
            </a>
          )}

          {hasEmail && emailAddress && (
            <div className="flex gap-2">
              <a
                href={`mailto:${emailAddress}?subject=Candidatura para a vaga de ${encodeURIComponent(job.nome)} - ${encodeURIComponent(job.empresa)}&body=Olá,%20gostaria%20de%20me%20candidatar%20à%20vaga%20de%20${encodeURIComponent(job.nome)}.%20Segue%20em%20anexo%20meu%20currículo.`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm p-3 rounded-xl text-center flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>Enviar Currículo por E-mail</span>
              </a>

              <button
                type="button"
                onClick={handleCopyEmail}
                title="Copiar endereço de e-mail"
                className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl transition cursor-pointer flex items-center justify-center border border-gray-200 dark:border-gray-700"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {hasEmail && emailAddress && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center font-medium">
              E-mail de contato: <span className="font-bold text-blue-600 dark:text-blue-400">{emailAddress}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
