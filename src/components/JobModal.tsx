import React from 'react';
import { X, Building2, MapPin, DollarSign, MessageCircle, Briefcase, FileText } from 'lucide-react';
import { JobOffer } from '../types';

interface JobModalProps {
  job: JobOffer | null;
  onClose: () => void;
}

export const JobModal: React.FC<JobModalProps> = ({ job, onClose }) => {
  if (!job) return null;

  const isWhatsApp = job.linkContato.includes('wa.me') || job.linkContato.includes('whatsapp') || job.linkContato.startsWith('55');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 relative border border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded uppercase tracking-wide">
              Oportunidade Aberta
            </span>
            <h3 className="text-lg font-black text-gray-900 mt-1 leading-snug">{job.nome}</h3>
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{job.empresa}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-3">
          <div className="text-xs text-gray-700 space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Local:</strong> {job.local}
              </span>
            </p>
            <p className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Salário:</strong> {job.salario}
              </span>
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Descrição da Vaga</span>
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50/80 p-3 rounded-xl border border-gray-100">
              {job.descricao}
            </p>
          </div>

          {job.requisitos && (
            <div>
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Requisitos & Qualificações</span>
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                {job.requisitos}
              </p>
            </div>
          )}
        </div>

        <a
          href={job.linkContato}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm p-3.5 rounded-xl text-center flex items-center justify-center gap-2 transition shadow-md"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{isWhatsApp ? 'Candidatar-se via WhatsApp' : 'Entrar em Contato'}</span>
        </a>
      </div>
    </div>
  );
};
