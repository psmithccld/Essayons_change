// Prebuilt survey templates based on change management phases

export interface PrebuiltSurveyTemplate {
  id: string;
  title: string;
  description: string;
  phase: 'phase-1' | 'phase-3' | 'phase-4' | 'phase-5';
  phaseName: string;
  questions: Array<{
    id: string;
    type: 'multiple_choice' | 'scale' | 'text' | 'yes_no';
    question: string;
    options?: string[];
    required: boolean;
  }>;
}

export const PREBUILT_SURVEYS: PrebuiltSurveyTemplate[] = [
  {
    id: 'individual-readiness-phase-1',
    title: 'Individual Readiness for Change Survey',
    description: 'Assess awareness, urgency, and willingness to engage in the proposed change initiative.',
    phase: 'phase-1',
    phaseName: 'Phase 1 – Identify Need to Change',
    questions: [
      {
        id: '1',
        type: 'scale',
        question: 'I understand why this change is needed.',
        required: true,
      },
      {
        id: '2',
        type: 'scale',
        question: 'I believe this change is urgent for the organization\'s success.',
        required: true,
      },
      {
        id: '3',
        type: 'scale',
        question: 'I feel personally ready to adapt to this change.',
        required: true,
      },
      {
        id: '4',
        type: 'scale',
        question: 'I have the skills/resources to adapt if the change moves forward.',
        required: true,
      },
      {
        id: '5',
        type: 'scale',
        question: 'I trust leadership to guide the organization effectively through change.',
        required: true,
      },
      {
        id: '6',
        type: 'text',
        question: 'What concerns do you have about the proposed change?',
        required: false,
      },
    ],
  },
  {
    id: 'change-understanding-phase-3',
    title: 'Change Understanding Survey',
    description: 'Gauge clarity of communications and understanding before rollout.',
    phase: 'phase-3',
    phaseName: 'Phase 3 – Develop the Change',
    questions: [
      {
        id: '1',
        type: 'scale',
        question: 'I understand what the change involves.',
        required: true,
      },
      {
        id: '2',
        type: 'scale',
        question: 'I know how this change will impact my role.',
        required: true,
      },
      {
        id: '3',
        type: 'scale',
        question: 'Leadership has clearly explained the purpose of the change.',
        required: true,
      },
      {
        id: '4',
        type: 'scale',
        question: 'I feel I will have the resources/training to support the change.',
        required: true,
      },
      {
        id: '5',
        type: 'scale',
        question: 'I know where to go for more information.',
        required: true,
      },
      {
        id: '6',
        type: 'text',
        question: 'What additional information or training would help you prepare?',
        required: false,
      },
    ],
  },
  {
    id: 'change-reaction-pulse-phase-4',
    title: 'Change Reaction / Pulse Survey',
    description: 'Track sentiment, adoption barriers, and reactions during rollout.',
    phase: 'phase-4',
    phaseName: 'Phase 4 – Implement the Change',
    questions: [
      {
        id: '1',
        type: 'multiple_choice',
        question: 'How do you feel about the change right now?',
        options: ['Excited', 'Neutral', 'Concerned', 'Resistant'],
        required: true,
      },
      {
        id: '2',
        type: 'scale',
        question: 'I feel supported in adapting to this change.',
        required: true,
      },
      {
        id: '3',
        type: 'scale',
        question: 'The communication I receive about this change is timely and useful.',
        required: true,
      },
      {
        id: '4',
        type: 'scale',
        question: 'I am confident using the new tools/processes associated with this change.',
        required: true,
      },
      {
        id: '5',
        type: 'text',
        question: 'What\'s working well so far?',
        required: false,
      },
      {
        id: '6',
        type: 'text',
        question: 'What challenges are you experiencing?',
        required: false,
      },
    ],
  },
  {
    id: 'post-mortem-phase-5',
    title: 'Post-Mortem / After-Action Review Survey',
    description: 'Capture lessons learned and sustainability of the change initiative.',
    phase: 'phase-5',
    phaseName: 'Phase 5 – Reinforce the Change',
    questions: [
      {
        id: '1',
        type: 'scale',
        question: 'This change has been successfully integrated into my daily work.',
        required: true,
      },
      {
        id: '2',
        type: 'scale',
        question: 'The change delivered the benefits that were promised.',
        required: true,
      },
      {
        id: '3',
        type: 'scale',
        question: 'Leadership reinforced and modeled the change consistently.',
        required: true,
      },
      {
        id: '4',
        type: 'scale',
        question: 'The organization learned from challenges and improved as the change progressed.',
        required: true,
      },
      {
        id: '5',
        type: 'multiple_choice',
        question: 'On a scale of 1–10, how successful do you feel this change was overall?',
        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        required: true,
      },
      {
        id: '6',
        type: 'text',
        question: 'What should leadership do differently in future change initiatives?',
        required: false,
      },
    ],
  },
];

export function getPrebuiltSurveysByPhase(phase: string): PrebuiltSurveyTemplate[] {
  return PREBUILT_SURVEYS.filter(survey => survey.phase === phase);
}

export function getPrebuiltSurveyById(id: string): PrebuiltSurveyTemplate | undefined {
  return PREBUILT_SURVEYS.find(survey => survey.id === id);
}