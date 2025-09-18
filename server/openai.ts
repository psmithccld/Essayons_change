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
