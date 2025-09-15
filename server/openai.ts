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
