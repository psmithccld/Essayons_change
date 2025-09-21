import { openai } from './openai';
import fs from 'fs/promises';
import path from 'path';

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    filename: string;
    chunkIndex: number;
    totalChunks: number;
    source: string;
  };
}

interface SearchResult {
  document: VectorDocument;
  similarity: number;
}

class VectorStore {
  private documents: VectorDocument[] = [];

  // Cosine similarity function
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Split text into smaller chunks for better embedding quality
  private splitIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text]; // Fallback to original text if no chunks
  }

  // Generate embedding for text using OpenAI
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Add a document to the vector store
  async addDocument(content: string, filename: string, source: string = 'knowledge_base'): Promise<void> {
    const chunks = this.splitIntoChunks(content);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      
      const document: VectorDocument = {
        id: `${filename}_chunk_${i}`,
        content: chunk,
        embedding,
        metadata: {
          filename,
          chunkIndex: i,
          totalChunks: chunks.length,
          source
        }
      };

      this.documents.push(document);
    }

    console.log(`Added ${chunks.length} chunks from ${filename} to vector store`);
  }

  // Search for similar documents
  async search(query: string, limit: number = 5, minSimilarity: number = 0.1): Promise<SearchResult[]> {
    if (this.documents.length === 0) {
      console.warn('Vector store is empty');
      return [];
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = this.documents
        .map(doc => ({
          document: doc,
          similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
        }))
        .filter(result => result.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Error searching vector store:', error);
      return [];
    }
  }

  // Get context from search results for GPT prompts
  async getRelevantContext(query: string, maxContextLength: number = 3000): Promise<string> {
    const searchResults = await this.search(query, 10, 0.2);
    
    if (searchResults.length === 0) {
      return '';
    }

    let context = '';
    let currentLength = 0;

    for (const result of searchResults) {
      const addition = `[${result.document.metadata.filename}] ${result.document.content}\n\n`;
      if (currentLength + addition.length > maxContextLength) {
        break;
      }
      context += addition;
      currentLength += addition.length;
    }

    return context.trim();
  }

  // Load documents from the knowledge base directory
  async loadKnowledgeBase(knowledgeBasePath: string = 'server/knowledge_base'): Promise<void> {
    try {
      const files = await fs.readdir(knowledgeBasePath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      console.log(`Loading ${markdownFiles.length} files from knowledge base...`);

      for (const filename of markdownFiles) {
        const filePath = path.join(knowledgeBasePath, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        await this.addDocument(content, filename, 'knowledge_base');
      }

      console.log(`Successfully loaded ${this.documents.length} document chunks into vector store`);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      throw error;
    }
  }

  // Get statistics about the vector store
  getStats(): {
    totalDocuments: number;
    filesCounts: Record<string, number>;
    sources: Record<string, number>;
  } {
    const filesCounts: Record<string, number> = {};
    const sources: Record<string, number> = {};

    for (const doc of this.documents) {
      filesCounts[doc.metadata.filename] = (filesCounts[doc.metadata.filename] || 0) + 1;
      sources[doc.metadata.source] = (sources[doc.metadata.source] || 0) + 1;
    }

    return {
      totalDocuments: this.documents.length,
      filesCounts,
      sources
    };
  }

  // Clear all documents
  clear(): void {
    this.documents = [];
    console.log('Vector store cleared');
  }
}

// Create and export a singleton instance
export const vectorStore = new VectorStore();

// Enhanced OpenAI functions that use vector store context
export async function generateContextAwareResponse(query: string, systemPrompt: string = ''): Promise<{
  response: string;
  context: string;
  relevantSources: string[];
}> {
  const context = await vectorStore.getRelevantContext(query);
  const searchResults = await vectorStore.search(query, 5);
  const relevantSources = [...new Set(searchResults.map(r => r.document.metadata.filename))];

  const prompt = `${systemPrompt}

Context from knowledge base:
${context}

User query: ${query}

Please provide a response based on the context above. If the context doesn't contain relevant information, indicate that clearly.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return {
    response: response.choices[0].message.content || '',
    context,
    relevantSources
  };
}

// Initialize vector store with knowledge base on startup
export async function initializeVectorStore(): Promise<void> {
  try {
    console.log('Initializing vector store...');
    await vectorStore.loadKnowledgeBase();
    const stats = vectorStore.getStats();
    console.log('Vector store initialized:', stats);
  } catch (error) {
    console.error('Failed to initialize vector store:', error);
    // Don't throw - app should still work without vector store
  }
}