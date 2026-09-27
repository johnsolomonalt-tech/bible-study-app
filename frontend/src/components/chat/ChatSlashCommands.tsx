"use client";

import React from 'react';
import { 
  BookOpen, 
  Languages, 
  Scroll, 
  Flame, 
  GraduationCap, 
  Heart, 
  Network, 
  Palette 
} from 'lucide-react';
import { TheologicalLensType } from './TheologicalLensSelector';

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  template: string;
  lens?: TheologicalLensType;
  mode?: 'study' | 'image';
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/exegesis',
    label: 'Exegesis',
    description: 'Deep verse-by-verse grammatical, historical, and theological breakdown',
    icon: <BookOpen size={14} className="text-blue-500" />,
    template: 'Provide an in-depth grammatical and historical exegesis of ',
    lens: 'canonical'
  },
  {
    command: '/greek',
    label: 'Greek Word Study',
    description: 'New Testament Greek lemmas, morphology, and Strong’s concordance',
    icon: <Languages size={14} className="text-emerald-500" />,
    template: 'Conduct a Greek word study and grammatical analysis of ',
    lens: 'scholarly'
  },
  {
    command: '/hebrew',
    label: 'Hebrew Word Study',
    description: 'Old Testament Hebrew roots, stems, and etymological depth',
    icon: <Languages size={14} className="text-amber-500" />,
    template: 'Conduct a Hebrew root word study and theological analysis of ',
    lens: 'scholarly'
  },
  {
    command: '/patristic',
    label: 'Early Church Fathers',
    description: 'Wisdom of Augustine, Chrysostom, Irenaeus, and ancient homilies',
    icon: <Scroll size={14} className="text-purple-500" />,
    template: 'How did the Early Church Fathers (1st–6th centuries AD) interpret and preach on ',
    lens: 'patristic'
  },
  {
    command: '/reformation',
    label: 'Reformation Theology',
    description: 'Justification by faith, Solas, Luther, Calvin, and historic confessions',
    icon: <Flame size={14} className="text-red-500" />,
    template: 'Examine this through the historic Reformation perspective (Luther, Calvin, Solas): ',
    lens: 'reformation'
  },
  {
    command: '/scholarly',
    label: 'Academic Exegesis',
    description: 'Ancient Near Eastern / Greco-Roman background & modern scholarship',
    icon: <GraduationCap size={14} className="text-emerald-500" />,
    template: 'Provide an academic, historical-grammatical analysis of ',
    lens: 'scholarly'
  },
  {
    command: '/devotional',
    label: 'Contemplative Prayer',
    description: 'Heart transformation, spiritual formation, and prayerful meditation',
    icon: <Heart size={14} className="text-amber-500" />,
    template: 'Provide a prayerful, contemplative devotional reflection with self-examination on ',
    lens: 'contemplative'
  },
  {
    command: '/crossref',
    label: 'Cross References',
    description: 'Trace recurring themes, prophecies, and fulfillments across Scripture',
    icon: <Network size={14} className="text-cyan-500" />,
    template: 'Map out the major cross-references across the Old and New Testaments for ',
    lens: 'canonical'
  },
  {
    command: '/art',
    label: 'Sacred Artwork',
    description: 'Render reverent, illuminated sacred art depicting a biblical scene',
    icon: <Palette size={14} className="text-[#c96442]" />,
    template: 'Generate a sacred, reverent, illuminated biblical image of ',
    mode: 'image'
  }
];

interface ChatSlashCommandsProps {
  filter: string;
  onSelectCommand: (cmd: SlashCommand) => void;
  onClose: () => void;
}

export const ChatSlashCommands: React.FC<ChatSlashCommandsProps> = ({
  filter,
  onSelectCommand,
}) => {
  const query = filter.toLowerCase().replace('/', '').trim();
  const filtered = SLASH_COMMANDS.filter(c => 
    c.command.toLowerCase().includes(query) || 
    c.label.toLowerCase().includes(query) ||
    c.description.toLowerCase().includes(query)
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-30 bg-surface border border-border-soft rounded-2xl shadow-xl overflow-hidden p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md max-h-64 overflow-y-auto custom-scroll">
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between border-b border-border/50 mb-1">
        <span>Theological Slash Commands</span>
        <span>Tab or Click to apply</span>
      </div>

      <div className="space-y-0.5">
        {filtered.map((cmd) => (
          <button
            key={cmd.command}
            type="button"
            onClick={() => onSelectCommand(cmd)}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-hover/80 text-fg transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-surface-warm/70 group-hover:bg-surface-warm text-fg shrink-0">
                {cmd.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-accent group-hover:underline">
                    {cmd.command}
                  </span>
                  <span className="text-[12px] font-medium text-fg truncate">
                    {cmd.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted truncate">
                  {cmd.description}
                </p>
              </div>
            </div>
            {cmd.lens && (
              <span className="hidden sm:inline-block text-[10px] font-medium text-meta uppercase tracking-wider bg-surface/80 px-2 py-0.5 rounded-md shrink-0">
                {cmd.lens}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
