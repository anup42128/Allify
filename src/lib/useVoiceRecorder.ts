import { useState, useRef, useCallback } from 'react';

/**
 * Result of a successful voice recording
 */
export interface VoiceRecording {
    blob: Blob;
    duration: number; // in seconds
}

export const useVoiceRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intentToRecordRef = useRef<boolean>(false);

    const startRecording = useCallback(async () => {
        // INSTANT GAPLESS UI BOOTUP: Transition the interface to Recording mode immediately
        setIsRecording(true);
        setIsPaused(false);
        setDuration(0);
        setError(null);
        intentToRecordRef.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });
            
            // If the user frantically clicked Cancel during the 1000ms+ OS microphone hardware boot time, cleanly tear it down.
            if (!intentToRecordRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                audioBitsPerSecond: 128000
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;

            // Start duration timer
            timerRef.current = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (err: any) {
            console.error('Error accessing microphone:', err);
            setError('Microphone access denied or unavailable.');
            setIsRecording(false);
            intentToRecordRef.current = false;
        }
    }, []);

    const stopRecording = useCallback((): Promise<VoiceRecording | null> => {
        return new Promise((resolve) => {
            intentToRecordRef.current = false;
            
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                resolve(null);
                return;
            }

            // Immediately clear UI state so the recording indicator vanishes instantly
            setIsRecording(false);
            setIsPaused(false);

            mediaRecorderRef.current.onstop = () => {
                // Clean up tracks to stop the mic indicator in the browser
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                if (timerRef.current) clearInterval(timerRef.current);
                
                // Finalize blob and figure out format based on what was actually recorded
                const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                
                resolve({
                    blob: audioBlob,
                    duration: duration
                });
            };

            mediaRecorderRef.current.stop();
        });
    }, [duration]);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            if (timerRef.current) clearInterval(timerRef.current);
            setIsPaused(true);
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            timerRef.current = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
            setIsPaused(false);
        }
    }, []);

    const cancelRecording = useCallback(() => {
        intentToRecordRef.current = false; // Defeat the hardware race condition cleanly
        
        // Immediately clear UI state for zero-latency feedback
        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);
        
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
        
        mediaRecorderRef.current.onstop = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
        
        mediaRecorderRef.current.stop();
    }, []);

    return {
        isRecording,
        isPaused,
        duration,
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording
    };
};
