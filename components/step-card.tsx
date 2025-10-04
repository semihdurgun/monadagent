'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export function StepCard({
    title,
    desc,
    children,
}: {
    title: string;
    desc?: string;
    children: React.ReactNode;
}) {
    return (
        <Card className='border-border/60 bg-background/60 backdrop-blur'>
            <CardHeader>
                <CardTitle className='text-lg'>{title}</CardTitle>
                {desc && <CardDescription>{desc}</CardDescription>}
            </CardHeader>
            <CardContent className='space-y-4'>{children}</CardContent>
        </Card>
    );
}
