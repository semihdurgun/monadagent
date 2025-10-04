'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export type StepMeta = {
    id: string;
    title: string;
    done?: boolean;
    active?: boolean;
};

export function Stepper({ steps }: { steps: StepMeta[] }) {
    return (
        <ol className='flex w-full items-center gap-3 overflow-x-auto'>
            {steps.map((s, i) => {
                const state = s.done ? 'done' : s.active ? 'active' : 'idle';
                return (
                    <li key={s.id} className='flex items-center gap-2'>
                        <div
                            className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full border text-xs',
                                state === 'done' &&
                                    'border-green-500/40 bg-green-500/10 text-green-400',
                                state === 'active' &&
                                    'border-primary/60 bg-primary/10 text-primary',
                                state === 'idle' &&
                                    'border-border/60 text-muted-foreground'
                            )}
                            title={s.title}
                        >
                            {state === 'done' ? (
                                <Check className='h-4 w-4' />
                            ) : (
                                i + 1
                            )}
                        </div>
                        <span
                            className={cn(
                                'text-xs',
                                state === 'done' && 'text-green-400',
                                state === 'active' && 'text-primary',
                                state === 'idle' && 'text-muted-foreground'
                            )}
                        >
                            {s.title}
                        </span>
                        {i < steps.length - 1 && (
                            <span className='mx-2 h-px w-6 bg-border/60' />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
