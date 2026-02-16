"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    FileVideo, HardDrive, Hash, Type,
    Database, Calendar, Lock, Unlock,
    Save, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyInspectorProps {
    data: {
        title: string;
        description: string;
        duration: number | null;
        createdAt: string;
        status: string;
        id: string;
    };
    onSave: (updates: { title: string; description: string }) => void;
    isSaving: boolean;
}

export function PropertyInspector({ data, onSave, isSaving }: PropertyInspectorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ title: data.title, description: data.description });

    // Reset form when data changes
    // useEffect(() => setForm({ title: data.title, description: data.description }), [data]);

    const handleSave = () => {
        onSave(form);
        setIsEditing(false);
    };

    return (
        <div className="h-full bg-card/30 backdrop-blur-md border-l border-border/50 flex flex-col w-80">
            <div className="p-4 border-b border-border/50">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2 uppercase tracking-wider">
                    <Database className="w-4 h-4 text-primary" />
                    자산 속성 (Properties)
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Basic Info Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-muted-foreground uppercase">기본 메타데이터</p>
                        {!isEditing ? (
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setIsEditing(true)}>
                                수정
                            </Button>
                        ) : (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditing(false)}><X className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" className="h-6 w-6 p-0" onClick={handleSave} disabled={isSaving}>
                                    <Save className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Type className="w-3 h-3" /> 제목
                            </Label>
                            {isEditing ? (
                                <Input
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="h-8 text-sm"
                                />
                            ) : (
                                <p className="text-sm font-medium break-words leading-snug">{data.title || "-"}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Hash className="w-3 h-3" /> 설명/노트
                            </Label>
                            {isEditing ? (
                                <Textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="min-h-[100px] text-sm resize-none"
                                />
                            ) : (
                                <div className="text-sm text-muted-foreground/80 bg-background/50 p-3 rounded-md min-h-[80px] text-xs leading-relaxed whitespace-pre-wrap border border-white/5">
                                    {data.description || "작성된 노트가 없습니다."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Technical Specs Section (Mock/Real Mixed) */}
                <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase">기술 사양 (Specs)</p>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <FileVideo className="w-3 h-3" />
                                포맷
                            </div>
                            <p className="text-xs font-mono font-bold">H.264 / MP4</p>
                        </div>

                        <div className="bg-background/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <HardDrive className="w-3 h-3" />
                                해상도 (예상)
                            </div>
                            <p className="text-xs font-mono font-bold">1920 x 1080</p>
                        </div>

                        <div className="bg-background/40 p-2.5 rounded-lg border border-white/5 space-y-1 col-span-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Lock className="w-3 h-3" />
                                콘텐츠 ID
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground truncate" title={data.id}>
                                {data.id}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
