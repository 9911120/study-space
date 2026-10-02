import { CircleDashed, CircleHelp, CircleCheck, BookOpen, StickyNote } from 'lucide-react'
import type { NodeKind, NodeStatus } from '../../shared/schema'
export const statuses: Record<
  NodeStatus,
  { label: string; icon: typeof CircleDashed; className: string }
> = {
  exploring: { label: '공부 중', icon: CircleDashed, className: 'status-exploring' },
  understood: { label: '이해함', icon: CircleCheck, className: 'status-understood' },
  question: { label: '열린 질문', icon: CircleHelp, className: 'status-question' },
}
export const kinds: Record<NodeKind, { label: string; icon: typeof BookOpen }> = {
  concept: { label: '개념', icon: BookOpen },
  question: { label: '질문', icon: CircleHelp },
  note: { label: '메모', icon: StickyNote },
}
