import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export async function generateCommunicationPlan(projectInfo: {
  name: string;
  description: string;
  stakeholders: Array<{
    name: string;
    role: string;
    supportLevel: string;
    influenceLevel: string;
  }>;
}): Promise<{
  strategy: string;
  channels: string[];
  frequency: string;
  keyMessages: string[];
}> {
  const prompt = `As a change management expert, create a comprehensive communication plan for the following project:

Project: ${projectInfo.name}
Description: ${projectInfo.description}

Stakeholders:
${projectInfo.stakeholders.map(s => `- ${s.name} (${s.role}) - Support: ${s.supportLevel}, Influence: ${s.influenceLevel}`).join('\n')}

Please provide a communication strategy including:
1. Overall communication strategy
2. Recommended communication channels
3. Communication frequency
4. Key messages to emphasize

Return the response as JSON in this format:
{
  "strategy": "overall strategy description",
  "channels": ["channel1", "channel2"],
  "frequency": "recommended frequency",
  "keyMessages": ["message1", "message2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function analyzeChangeReadiness(surveyData: {
  responses: Array<{
    questionId: string;
    question: string;
    answer: string | number;
  }>;
  stakeholderData: Array<{
    supportLevel: string;
    engagementLevel: string;
    role: string;
  }>;
}): Promise<{
  overallScore: number;
  insights: string[];
  recommendations: string[];
  riskAreas: string[];
}> {
  const prompt = `As a change management expert, analyze this change readiness data:

Survey Responses:
${surveyData.responses.map(r => `Q: ${r.question} - A: ${r.answer}`).join('\n')}

Stakeholder Data:
${surveyData.stakeholderData.map(s => `${s.role}: Support=${s.supportLevel}, Engagement=${s.engagementLevel}`).join('\n')}

Provide an analysis including:
1. Overall readiness score (0-100)
2. Key insights from the data
3. Recommendations for improvement
4. Risk areas to address

Return as JSON:
{
  "overallScore": number,
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"],
  "riskAreas": ["risk1", "risk2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function generateRiskMitigationStrategies(risks: Array<{
  title: string;
  description: string;
  severity: string;
  impact: string;
  probability: string;
}>): Promise<{
  strategies: Array<{
    riskTitle: string;
    mitigation: string;
    preventive: string;
    contingency: string;
  }>;
  overallRecommendations: string[];
}> {
  const prompt = `As a risk management expert, provide mitigation strategies for these project risks:

${risks.map(r => `Risk: ${r.title}
Description: ${r.description}
Severity: ${r.severity}, Impact: ${r.impact}, Probability: ${r.probability}
`).join('\n')}

For each risk, provide:
1. Mitigation strategy
2. Preventive measures
3. Contingency plan

Also provide overall recommendations for risk management.

Return as JSON:
{
  "strategies": [
    {
      "riskTitle": "title",
      "mitigation": "strategy",
      "preventive": "measures",
      "contingency": "plan"
    }
  ],
  "overallRecommendations": ["rec1", "rec2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function getStakeholderEngagementTips(stakeholders: Array<{
  name: string;
  role: string;
  supportLevel: string;
  influenceLevel: string;
  engagementLevel: string;
}>): Promise<{
  generalTips: string[];
  specificTips: Array<{
    stakeholder: string;
    tips: string[];
  }>;
}> {
  const prompt = `As a stakeholder management expert, provide engagement tips for these stakeholders:

${stakeholders.map(s => `${s.name} - ${s.role}
Support: ${s.supportLevel}, Influence: ${s.influenceLevel}, Engagement: ${s.engagementLevel}
`).join('\n')}

Provide:
1. General stakeholder engagement tips
2. Specific tips for each stakeholder based on their profile

Return as JSON:
{
  "generalTips": ["tip1", "tip2"],
  "specificTips": [
    {
      "stakeholder": "name",
      "tips": ["tip1", "tip2"]
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function generateChangeContent(type: 'flyer' | 'email' | 'meeting_prompt', context: {
  projectName: string;
  changeDescription: string;
  targetAudience: string[];
  keyMessages: string[];
}): Promise<{
  title: string;
  content: string;
  callToAction: string;
}> {
  const prompt = `Create ${type} content for this change initiative:

Project: ${context.projectName}
Change: ${context.changeDescription}
Audience: ${context.targetAudience.join(', ')}
Key Messages: ${context.keyMessages.join(', ')}

Create engaging, clear content that:
- Explains the change and its benefits
- Addresses potential concerns
- Includes a clear call to action
- Uses appropriate tone for the audience

Return as JSON:
{
  "title": "content title",
  "content": "main content body",
  "callToAction": "clear call to action"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function generateResistanceCounterMessages(resistancePoints: Array<{
  title: string;
  description: string;
  severity: string;
  affectedGroups: string[];
}>): Promise<{
  counterMessages: Array<{
    resistanceTitle: string;
    counterMessage: string;
    tactics: string[];
    channels: string[];
  }>;
  generalStrategies: string[];
}> {
  const prompt = `As a change management expert, generate counter-messages and tactics for these resistance points:

${resistancePoints.map(r => `Resistance: ${r.title}
Description: ${r.description}
Severity: ${r.severity}
Affected Groups: ${r.affectedGroups.join(', ')}
`).join('\n')}

For each resistance point, provide:
1. A compelling counter-message that addresses the specific concern
2. Tactical approaches to deliver the message
3. Most effective communication channels

Also provide general strategies for managing resistance.

Return as JSON:
{
  "counterMessages": [
    {
      "resistanceTitle": "title",
      "counterMessage": "compelling response",
      "tactics": ["tactic1", "tactic2"],
      "channels": ["channel1", "channel2"]
    }
  ],
  "generalStrategies": ["strategy1", "strategy2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

// Enhanced error handling interface
interface AIServiceError {
  type: 'api_key' | 'rate_limit' | 'network' | 'service_unavailable' | 'unknown';
  message: string;
  fallbackAvailable: boolean;
}

// Wrapper function to handle OpenAI errors gracefully
function handleOpenAIError(error: any): AIServiceError {
  if (error.status === 401) {
    return {
      type: 'api_key',
      message: 'OpenAI API key is missing or invalid. Please configure a valid API key to enable AI-powered features.',
      fallbackAvailable: true
    };
  }
  if (error.status === 429) {
    return {
      type: 'rate_limit',
      message: 'OpenAI API rate limit exceeded. Please try again later.',
      fallbackAvailable: true
    };
  }
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return {
      type: 'network',
      message: 'Unable to connect to OpenAI service. Please check your internet connection.',
      fallbackAvailable: true
    };
  }
  if (error.status >= 500) {
    return {
      type: 'service_unavailable',
      message: 'OpenAI service is temporarily unavailable. Please try again later.',
      fallbackAvailable: true
    };
  }
  return {
    type: 'unknown',
    message: 'An unexpected error occurred with the AI service.',
    fallbackAvailable: true
  };
}

export async function generatePhaseGuidance(phase: string, projectContext: {
  name: string;
  description: string;
  currentPhase: string;
}): Promise<{
  keyThemes: string[];
  communicationObjectives: string[];
  recommendedChannels: string[];
  keyMessages: string[];
  timeline: {
    week: string;
    activities: string[];
  }[];
  aiError?: AIServiceError;
}> {
  const prompt = `As a change management expert, provide communication guidance for the "${phase}" phase of this change initiative:

Project: ${projectContext.name}
Description: ${projectContext.description}
Current Phase: ${projectContext.currentPhase}

For the ${phase} phase, provide:
1. Key communication themes to emphasize
2. Primary communication objectives
3. Most effective communication channels
4. Core messages to convey
5. Weekly timeline with key activities

Return as JSON:
{
  "keyThemes": ["theme1", "theme2"],
  "communicationObjectives": ["objective1", "objective2"],
  "recommendedChannels": ["channel1", "channel2"],
  "keyMessages": ["message1", "message2"],
  "timeline": [
    {
      "week": "Week 1",
      "activities": ["activity1", "activity2"]
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

// Meeting-specific GPT functions for meeting management

export async function generateMeetingAgenda(meetingData: {
  projectName: string;
  meetingType: string; // status, planning, review, decision, brainstorming
  meetingPurpose: string;
  duration: number; // in minutes
  participants: Array<{
    name: string;
    role: string;
  }>;
  objectives: string[];
  raidLogContext?: Array<{
    id: string;
    title: string;
    type: string;
    description: string;
  }>;
}): Promise<{
  agenda: Array<{
    item: string;
    timeAllocation: number;
    owner: string;
    type: string; // discussion, presentation, decision, brainstorming
  }>;
  meetingStructure: {
    opening: string;
    mainTopics: string[];
    closing: string;
  };
  preparationNotes: string[];
  bestPractices: string[];
}> {
  const raidContext = meetingData.raidLogContext ? 
    `\nRelated RAID Items:\n${meetingData.raidLogContext.map(item => 
      `- ${item.type.toUpperCase()}: ${item.title} - ${item.description}`
    ).join('\n')}` : '';

  const prompt = `As a meeting facilitation expert, create a professional meeting agenda for this change management meeting:

Project: ${meetingData.projectName}
Meeting Type: ${meetingData.meetingType}
Purpose: ${meetingData.meetingPurpose}
Duration: ${meetingData.duration} minutes
Objectives: ${meetingData.objectives.join(', ')}

Participants:
${meetingData.participants.map(p => `- ${p.name} (${p.role})`).join('\n')}
${raidContext}

Create a structured agenda that:
1. Maximizes productivity within the time constraint
2. Ensures all objectives are addressed
3. Assigns appropriate time allocations
4. Designates owners for each agenda item
5. Follows best practices for ${meetingData.meetingType} meetings

Include preparation notes and best practices specific to this meeting type.

Return as JSON:
{
  "agenda": [
    {
      "item": "agenda item description",
      "timeAllocation": number_in_minutes,
      "owner": "person responsible",
      "type": "discussion|presentation|decision|brainstorming"
    }
  ],
  "meetingStructure": {
    "opening": "suggested opening approach",
    "mainTopics": ["topic1", "topic2"],
    "closing": "suggested closing approach"
  },
  "preparationNotes": ["note1", "note2"],
  "bestPractices": ["practice1", "practice2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function refineMeetingAgenda(currentAgenda: {
  agenda: Array<{
    item: string;
    timeAllocation: number;
    owner: string;
    type: string;
  }>;
  meetingType: string;
  duration: number;
  objectives: string[];
}, refinementRequest: string): Promise<{
  agenda: Array<{
    item: string;
    timeAllocation: number;
    owner: string;
    type: string;
  }>;
  improvements: string[];
  reasoning: string;
}> {
  const prompt = `As a meeting facilitation expert, refine this meeting agenda based on the specific request:

Current Agenda:
${currentAgenda.agenda.map(item => 
  `- ${item.item} (${item.timeAllocation}min, Owner: ${item.owner}, Type: ${item.type})`
).join('\n')}

Meeting Details:
- Type: ${currentAgenda.meetingType}
- Duration: ${currentAgenda.duration} minutes
- Objectives: ${currentAgenda.objectives.join(', ')}

Refinement Request: ${refinementRequest}

Please refine the agenda to address the specific request while:
1. Maintaining the total meeting duration
2. Ensuring all objectives are still addressed
3. Improving flow and productivity
4. Optimizing time allocations

Return as JSON:
{
  "agenda": [
    {
      "item": "refined agenda item",
      "timeAllocation": number_in_minutes,
      "owner": "person responsible",
      "type": "discussion|presentation|decision|brainstorming"
    }
  ],
  "improvements": ["improvement1", "improvement2"],
  "reasoning": "explanation of changes made"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function refineMeetingContent(currentContent: {
  title: string;
  agenda: Array<{
    item: string;
    timeAllocation: number;
    owner: string;
    type: string;
  }>;
  objectives: string[];
  preparation?: string;
}, refinementRequest: string, meetingContext: {
  meetingType: string;
  duration: number;
  participantCount: number;
}): Promise<{
  title: string;
  agenda: Array<{
    item: string;
    timeAllocation: number;
    owner: string;
    type: string;
  }>;
  objectives: string[];
  preparation: string;
  improvements: string[];
}> {
  const prompt = `As a meeting facilitation expert, refine this meeting content based on the following request:

Current Meeting Content:
Title: ${currentContent.title}
Objectives: ${currentContent.objectives.join(', ')}
Preparation: ${currentContent.preparation || 'None specified'}

Current Agenda:
${currentContent.agenda.map(item => 
  `- ${item.item} (${item.timeAllocation}min, Owner: ${item.owner}, Type: ${item.type})`
).join('\n')}

Meeting Context:
- Type: ${meetingContext.meetingType}
- Duration: ${meetingContext.duration} minutes
- Participants: ${meetingContext.participantCount}

Refinement Request: ${refinementRequest}

Please refine the meeting content addressing the specific request while maintaining:
1. Realistic time allocations
2. Clear ownership
3. Balanced participation
4. Meeting best practices

Return the refined content as JSON:
{
  "title": "refined title",
  "agenda": [
    {
      "item": "agenda item description",
      "timeAllocation": number_in_minutes,
      "owner": "person responsible",
      "type": "discussion|presentation|decision|brainstorming"
    }
  ],
  "objectives": ["objective1", "objective2"],
  "preparation": "preparation instructions",
  "improvements": ["improvement1", "improvement2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function generateMeetingInviteContent(meetingData: {
  projectName: string;
  title: string;
  purpose: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  agenda: Array<{
    item: string;
    timeAllocation: number;
  }>;
  preparation?: string;
  hostName: string;
}): Promise<{
  subject: string;
  htmlContent: string;
  textContent: string;
  calendarDescription: string;
}> {
  const prompt = `As a professional communication expert, create meeting invitation content:

Meeting Details:
- Project: ${meetingData.projectName}
- Title: ${meetingData.title}
- Purpose: ${meetingData.purpose}
- Date: ${meetingData.date}
- Time: ${meetingData.time}
- Duration: ${meetingData.duration} minutes
- Location: ${meetingData.location}
- Host: ${meetingData.hostName}

Agenda:
${meetingData.agenda.map(item => `- ${item.item} (${item.timeAllocation}min)`).join('\n')}

Preparation: ${meetingData.preparation || 'None required'}

Create professional invitation content that:
1. Clearly communicates all essential details
2. Sets expectations for participation
3. Includes the agenda and preparation requirements
4. Uses a professional, engaging tone
5. Provides both HTML and text versions
6. Includes appropriate calendar description

Return as JSON:
{
  "subject": "email subject line",
  "htmlContent": "formatted HTML email content",
  "textContent": "plain text email content",
  "calendarDescription": "brief description for calendar invite"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}