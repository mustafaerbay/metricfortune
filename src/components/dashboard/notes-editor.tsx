'use client';

import { useState, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Check, AlertCircle } from 'lucide-react';
import { updateImplementationNotes } from '@/actions/recommendations';

interface NotesEditorProps {
  recommendationId: string;
  initialNotes: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const MAX_CHARACTERS = 500;

export function NotesEditor({ recommendationId, initialNotes }: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const charactersRemaining = MAX_CHARACTERS - notes.length;
  const isOverLimit = charactersRemaining < 0;

  const handleSave = useCallback(async () => {
    if (isOverLimit) {
      setError(`Notes exceed ${MAX_CHARACTERS} character limit`);
      return;
    }

    if (notes === savedNotes) {
      // No changes to save
      return;
    }

    try {
      setSaveState('saving');
      setError(null);

      const result = await updateImplementationNotes(recommendationId, notes);

      if (result.success) {
        setSavedNotes(notes);
        setSaveState('saved');
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
        setError(result.error || 'Failed to save notes');
      }
    } catch (err) {
      setSaveState('error');
      setError('An unexpected error occurred');
      console.error('Failed to save implementation notes:', err);
    }
  }, [notes, savedNotes, recommendationId, isOverLimit]);

  // Auto-save on blur if there are changes
  const handleBlur = () => {
    if (notes !== savedNotes && !isOverLimit) {
      handleSave();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setSaveState('idle');
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Textarea */}
      <div className="relative">
        <Textarea
          value={notes}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Add notes about your implementation experience, challenges faced, or lessons learned..."
          className={`min-h-[100px] resize-y ${
            isOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''
          }`}
          maxLength={MAX_CHARACTERS + 50} // Allow typing a bit over to show error
          aria-label="Implementation notes"
          aria-describedby="notes-char-count notes-error"
        />
      </div>

      {/* Character Count & Save Status */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {/* Character Count */}
          <span
            id="notes-char-count"
            className={`text-xs ${
              isOverLimit
                ? 'font-semibold text-red-600'
                : charactersRemaining < 50
                ? 'text-amber-600'
                : 'text-gray-500'
            }`}
          >
            {charactersRemaining} characters remaining
          </span>

          {/* Save State Indicator */}
          {saveState === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Saving...
            </span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          {saveState === 'error' && error && (
            <span
              id="notes-error"
              className="flex items-center gap-1 text-xs text-red-600"
              role="alert"
            >
              <AlertCircle className="h-3 w-3" />
              {error}
            </span>
          )}
        </div>

        {/* Manual Save Button */}
        <Button
          onClick={handleSave}
          size="sm"
          variant="outline"
          disabled={
            saveState === 'saving' ||
            notes === savedNotes ||
            isOverLimit
          }
          className="h-8 gap-1 text-xs"
        >
          <Save className="h-3 w-3" />
          Save
        </Button>
      </div>

      {/* Help Text */}
      {!initialNotes && notes.length === 0 && (
        <p className="text-xs text-gray-500">
          💡 Tip: Document what you changed, what worked well, and any surprises you encountered.
        </p>
      )}
    </div>
  );
}
