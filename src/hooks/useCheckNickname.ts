import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type NicknameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

interface UseCheckNicknameReturn {
  status: NicknameStatus;
  message: string;
  checkNickname: (nickname: string) => void;
  reset: () => void;
}

export function useCheckNickname(excludeUserId?: string, debounceMs: number = 300): UseCheckNicknameReturn {
  const [status, setStatus] = useState<NicknameStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');

  const validateNickname = (value: string): { valid: boolean; message: string } => {
    if (!value || value.trim().length === 0) {
      return { valid: false, message: '' };
    }

    const trimmed = value.trim();

    if (trimmed.length < 2) {
      return { valid: false, message: '닉네임은 2자 이상이어야 합니다.' };
    }

    if (trimmed.length > 20) {
      return { valid: false, message: '닉네임은 20자 이하여야 합니다.' };
    }

    // Allow Korean, English, numbers, underscore, hyphen
    const validPattern = /^[가-힣a-zA-Z0-9_-]+$/;
    if (!validPattern.test(trimmed)) {
      return { valid: false, message: '한글, 영문, 숫자, _, - 만 사용 가능합니다.' };
    }

    return { valid: true, message: '' };
  };

  useEffect(() => {
    if (!nickname) {
      setStatus('idle');
      setMessage('');
      return;
    }

    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setStatus('invalid');
      setMessage(validation.message);
      return;
    }

    setStatus('checking');
    setMessage('확인 중...');

    const timer = setTimeout(async () => {
      try {
        // Build params - only include exclude_user_id if we have a valid UUID
        const params: { nickname_to_check: string; exclude_user_id?: string } = {
          nickname_to_check: nickname.trim(),
        };

        // Only add exclude_user_id if provided (for Settings page when editing own nickname)
        if (excludeUserId) {
          params.exclude_user_id = excludeUserId;
        }

        const { data, error } = await supabase.rpc('check_nickname_available', params);

        if (error) {
          console.error('Nickname check error:', error);
          setStatus('idle');
          setMessage('확인 중 오류가 발생했습니다.');
          return;
        }

        if (data === true) {
          setStatus('available');
          setMessage('사용 가능한 닉네임입니다.');
        } else {
          setStatus('taken');
          setMessage('이미 사용 중인 닉네임입니다.');
        }
      } catch (err) {
        console.error('Nickname check error:', err);
        setStatus('idle');
        setMessage('확인 중 오류가 발생했습니다.');
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [nickname, debounceMs, excludeUserId]);

  const checkNickname = useCallback((value: string) => {
    setNickname(value);
  }, []);

  const reset = useCallback(() => {
    setNickname('');
    setStatus('idle');
    setMessage('');
  }, []);

  return {
    status,
    message,
    checkNickname,
    reset,
  };
}
