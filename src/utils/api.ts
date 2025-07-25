export interface ApiResponse {
  response: string;
}

export interface ApiError {
  error: string;
}

export class ApiService {
  static async sendMessage(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling API:', error);
      
      // Fallback to mock response for development
      return this.generateMockResponse(prompt);
    }
  }

  static async generateMergedResponse(selectedMessages: string[]): Promise<string> {
    const mergePrompt = `Please analyze and synthesize these different conversation branches into a unified response that captures the key insights from each path:

${selectedMessages.join('\n\n')}

Create a comprehensive response that merges the best elements from these different directions while maintaining coherence and adding new insights where appropriate.`;

    try {
      return await this.sendMessage(mergePrompt);
    } catch (error) {
      console.error('Merge generation failed:', error);
      
      // Fallback merge response
      return this.generateMockMergeResponse(selectedMessages);
    }
  }

  static createContextPrompt(thread: Array<{type: string, content: string}>, userInput: string): string {
    const contextMessages = thread.map(msg =>
      `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    return `Here is our conversation history:\n\n${contextMessages}\n\nHuman: ${userInput}\n\nPlease respond naturally, taking into account the full conversation context above.`;
  }

  // Mock delay for better UX
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fallback mock responses for development/offline use
  private static generateMockResponse(prompt: string): string {
    const responses = [
      "That's an interesting question! Let me think about this from a few different angles...",
      "I can help you explore that topic. Here are some key considerations...",
      "Great point! This reminds me of several related concepts that might be useful...",
      "Let me break this down into a few main areas to consider...",
      "That's a complex topic with several important aspects to consider..."
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Add some topic-specific content based on keywords
    if (prompt.toLowerCase().includes('project')) {
      return `${randomResponse}\n\nFor project planning, consider these key elements:\n• Scope and objectives\n• Timeline and milestones\n• Required resources\n• Potential challenges\n• Success metrics`;
    } else if (prompt.toLowerCase().includes('creative')) {
      return `${randomResponse}\n\nCreative approaches often benefit from:\n• Brainstorming without constraints\n• Drawing inspiration from diverse sources\n• Iterating on initial ideas\n• Combining unexpected elements\n• Embracing experimentation`;
    } else if (prompt.toLowerCase().includes('tech')) {
      return `${randomResponse}\n\nTechnology considerations include:\n• Current best practices\n• Scalability requirements\n• Security implications\n• User experience design\n• Maintenance and updates`;
    }

    return `${randomResponse}\n\nThis is a development environment response. The actual AI service would provide more detailed and contextual answers.`;
  }

  private static generateMockMergeResponse(selectedMessages: string[]): string {
    const messageCount = selectedMessages.length;
    
    return `I've synthesized insights from ${messageCount} different conversation paths to provide a comprehensive perspective:

**Key Themes Identified:**
• Multiple approaches to the same core challenge
• Complementary perspectives that build on each other
• Common goals with different implementation strategies

**Integrated Recommendations:**
Based on combining these viewpoints, I suggest an approach that:
1. Takes the strongest elements from each path
2. Addresses the trade-offs between different options
3. Provides a balanced solution that considers multiple factors

**Next Steps:**
The merged perspective suggests focusing on the overlapping areas where these different approaches align, while also considering the unique benefits each individual path offers.

*Note: This is a fallback response generated when the AI service is unavailable. In production, this would be a more sophisticated synthesis of the actual conversation content.*`;
  }
}