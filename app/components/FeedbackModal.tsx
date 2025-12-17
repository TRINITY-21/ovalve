'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

const MAX_LENGTH = 2000;

export default function FeedbackModal({ isOpen, onClose, darkMode }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMessage('');
        setSubmitting(false);
        setSubmitted(false);
      }, 200);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    
    try {
      // Send feedback to Firebase
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      console.log('Feedback submitted successfully:', data);
      setSubmitted(true);
      
      // Close modal after showing success message
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setMessage('');
      }, 1200);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still show success to user (graceful degradation)
      // In production, you might want to show an error message
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setMessage('');
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      <div className={`relative w-full max-w-lg rounded-[28px] border shadow-2xl ${darkMode ? 'bg-slate-950 border-white/15 text-white shadow-black/40' : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'}`}>
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Send Feedback</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              We'd love to hear your thoughts! Your feedback helps us improve.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close feedback"
            onClick={onClose}
            className={`p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Tell us what you think..."
            className={`w-full rounded-2xl border px-4 py-3 min-h-[140px] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 shadow-sm ${
              darkMode
                ? 'bg-slate-900/80 border-white/15 text-white placeholder:text-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500'
            }`}
          />
          <div className={`mt-2 text-xs text-right ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {message.length}/{MAX_LENGTH} characters
          </div>

          {submitted && (
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold border shadow-sm ${darkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              Thank you for sharing your feedback!
            </div>
          )}
        </div>

        <div className={`flex justify-end gap-3 px-6 py-5 border-t ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold border shadow-sm transition-all hover:shadow-md ${
              darkMode
                ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-md transition-all hover:shadow-lg ${
              !message.trim() || submitting
                ? 'bg-slate-400/50 text-white/80 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 active:scale-95'
            }`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Send Feedback
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

