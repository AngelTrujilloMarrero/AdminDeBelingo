import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Volume2, Calculator } from 'lucide-react';

interface CaptchaProps {
    onValidate: (isValid: boolean) => void;
}

type CaptchaMode = 'text' | 'math';

interface MathChallenge {
    question: string;
    answer: number;
}

export default function Captcha({ onValidate }: CaptchaProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [captchaText, setCaptchaText] = useState('');
    const [mathChallenge, setMathChallenge] = useState<MathChallenge | null>(null);
    const [userInput, setUserInput] = useState('');
    const [mode, setMode] = useState<CaptchaMode>('text');
    const [isValid, setIsValid] = useState(false);

    // Generate random color with good contrast
    const getRandomColor = useCallback((isDark: boolean = false) => {
        if (isDark) {
            const h = Math.floor(Math.random() * 360);
            return `hsl(${h}, 70%, 30%)`;
        }
        const h = Math.floor(Math.random() * 360);
        return `hsl(${h}, 80%, 85%)`;
    }, []);

    // Generate math challenge
    const generateMathChallenge = useCallback((): MathChallenge => {
        const operations = ['+', '-', '×'];
        const op = operations[Math.floor(Math.random() * operations.length)];
        let a: number, b: number, answer: number;

        switch (op) {
            case '+':
                a = Math.floor(Math.random() * 20) + 1;
                b = Math.floor(Math.random() * 20) + 1;
                answer = a + b;
                break;
            case '-':
                a = Math.floor(Math.random() * 20) + 10;
                b = Math.floor(Math.random() * a);
                answer = a - b;
                break;
            case '×':
                a = Math.floor(Math.random() * 10) + 1;
                b = Math.floor(Math.random() * 10) + 1;
                answer = a * b;
                break;
            default:
                a = 1; b = 1; answer = 2;
        }

        return { question: `${a} ${op} ${b} = ?`, answer };
    }, []);

    const generateTextCaptcha = useCallback(() => {
        // Use more distinguishable characters
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }, []);

    const drawBezierNoise = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.1})`;
            ctx.lineWidth = Math.random() * 2 + 0.5;
            ctx.beginPath();

            const startX = Math.random() * width;
            const startY = Math.random() * height;
            const cp1X = Math.random() * width;
            const cp1Y = Math.random() * height;
            const cp2X = Math.random() * width;
            const cp2Y = Math.random() * height;
            const endX = Math.random() * width;
            const endY = Math.random() * height;

            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
            ctx.stroke();
        }
    }, []);

    const drawCaptcha = useCallback((text: string, isMath: boolean = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear and set gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add noise patterns
        // Bezier curves
        drawBezierNoise(ctx, width, height);

        // Random lines
        for (let i = 0; i < 8; i++) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`;
            ctx.lineWidth = Math.random() * 1.5 + 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.random() * width, Math.random() * height);
            ctx.lineTo(Math.random() * width, Math.random() * height);
            ctx.stroke();
        }

        // Random dots
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
            ctx.beginPath();
            ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw text with individual character styling
        const fontSize = isMath ? 20 : 26;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        const chars = text.split('');
        const totalWidth = chars.length * 28;
        const startX = (width - totalWidth) / 2 + 14;

        chars.forEach((char, i) => {
            ctx.save();

            const x = startX + i * 28;
            const y = height / 2 + (Math.random() - 0.5) * 10;

            ctx.translate(x, y);

            // Random rotation
            const rotation = (Math.random() - 0.5) * 0.5;
            ctx.rotate(rotation);

            // Random scale
            const scale = 0.9 + Math.random() * 0.3;
            ctx.scale(scale, scale);

            // Random font weight and style
            const weights = ['normal', 'bold'];
            const styles = ['normal', 'italic'];
            const weight = weights[Math.floor(Math.random() * weights.length)];
            const style = styles[Math.floor(Math.random() * styles.length)];
            ctx.font = `${style} ${weight} ${fontSize}px monospace`;

            // Shadow for depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            // Character color - use white with slight variations
            const brightness = 85 + Math.floor(Math.random() * 15);
            ctx.fillStyle = `hsl(0, 0%, ${brightness}%)`;

            ctx.fillText(char, 0, 0);
            ctx.restore();
        });

        // Add scanline effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }
    }, [drawBezierNoise]);

    const generateCaptcha = useCallback(() => {
        setUserInput('');
        setIsValid(false);
        onValidate(false);

        if (mode === 'math') {
            const challenge = generateMathChallenge();
            setMathChallenge(challenge);
            setCaptchaText(challenge.question);
            drawCaptcha(challenge.question, true);
        } else {
            const text = generateTextCaptcha();
            setCaptchaText(text);
            setMathChallenge(null);
            drawCaptcha(text);
        }
    }, [mode, generateMathChallenge, generateTextCaptcha, drawCaptcha, onValidate]);

    useEffect(() => {
        generateCaptcha();
    }, [mode]); // Regenerate when mode changes

    useEffect(() => {
        // Initial draw
        if (captchaText) {
            drawCaptcha(captchaText, mode === 'math');
        }
    }, [captchaText, drawCaptcha, mode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUserInput(value);

        let valid = false;
        if (mode === 'math' && mathChallenge) {
            valid = parseInt(value) === mathChallenge.answer;
        } else {
            // Case-insensitive comparison for text mode
            valid = value.toUpperCase() === captchaText.toUpperCase();
        }

        setIsValid(valid);
        onValidate(valid);
    };

    const handleRefresh = () => {
        generateCaptcha();
    };

    const toggleMode = () => {
        setMode(prev => prev === 'text' ? 'math' : 'text');
    };

    // Text-to-speech for accessibility
    const speakCaptcha = () => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance();
            if (mode === 'math' && mathChallenge) {
                utterance.text = mathChallenge.question.replace('×', 'multiplicado por').replace('?', '');
            } else {
                utterance.text = captchaText.split('').join(' ');
            }
            utterance.lang = 'es-ES';
            utterance.rate = 0.7;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <label className="text-white/80 text-sm font-medium flex items-center gap-2">
                    Verificación de seguridad
                    {isValid && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-200 border border-green-400/30">
                            ✓ Verificado
                        </span>
                    )}
                </label>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                        title={mode === 'text' ? 'Cambiar a desafío matemático' : 'Cambiar a texto'}
                    >
                        <Calculator size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={speakCaptcha}
                        className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                        title="Escuchar captcha"
                    >
                        <Volume2 size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                        title="Refrescar código"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            <div className="flex gap-3 mb-3">
                <canvas
                    ref={canvasRef}
                    width={220}
                    height={60}
                    className="rounded-xl border border-white/20 bg-white/5 shadow-inner"
                />
            </div>

            <div className="relative">
                <input
                    type={mode === 'math' ? 'number' : 'text'}
                    value={userInput}
                    onChange={handleInputChange}
                    placeholder={mode === 'math' ? 'Resultado' : 'Ingrese el código'}
                    className={`w-full px-4 py-2.5 bg-white/20 border rounded-xl
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     transition-all duration-300 text-center tracking-widest uppercase
                     ${isValid
                            ? 'border-green-400/50 focus:ring-green-400/50 bg-green-500/10'
                            : 'border-white/30 focus:ring-white/50 focus:border-white/50'
                        }`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                />
                {isValid && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            <p className="text-white/50 text-xs mt-2 text-center">
                {mode === 'math'
                    ? 'Resuelve la operación matemática'
                    : 'Ingrese los caracteres que ve en la imagen'}
            </p>
        </div>
    );
}
