import {
	BedrockAgentRuntimeClient,
	RetrieveAndGenerateCommand,
	RetrieveAndGenerateCommandInput,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { jsonrepair } from 'jsonrepair';

export const extractFirstJsonObject = (text: string): string | null => {
	const start = text.indexOf('{');
	if (start === -1) return null;

	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}') depth--;

		if (depth === 0) {
			let candidate = text.slice(start, i + 1);

			// Fix common issues before parsing
			candidate = candidate
				.replace(/,\s*([}\]])/g, '$1') // remove trailing commas
				.replace(/:\s*"([^"]*?)\n([^"]*?)"/gs, (_match, p1, p2) => `: "${p1}\\n${p2}"`); // escape newlines in strings

			try {
				const repaired = jsonrepair(candidate);
				JSON.parse(repaired); // test validity

				return repaired.replace(/\\n/g, ' ');
			} catch (e) {
				console.error('Malformed JSON found:', candidate, e);
				return null;
			}
		}
	}

	return null;
};

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

export const safeJsonBedrockQuery = async <T>(prompt: string, maxToken = 2000): Promise<T> => {
	const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
	const requestBody = {
		max_tokens: maxToken,
		messages: [{ role: 'user', content: prompt }],
		anthropic_version: 'bedrock-2023-05-31',
	};

	const maxAttempts = 5;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const command = new InvokeModelCommand({
				modelId,
				body: JSON.stringify(requestBody),
				accept: 'application/json',
				contentType: 'application/json',
			});

			const response = await bedrockClient.send(command);
			const responseText = Buffer.from(response.body).toString();

			let parsed = { content: [{ text: '' }] };
			try {
				parsed = JSON.parse(responseText);
			} catch (err) {
				throw new Error('Failed to parse Bedrock response');
			}

			const rawText = parsed?.content?.[0]?.text?.trim();
			if (!rawText) {
				throw new Error('Empty response text');
			}

			const jsonCandidate = extractFirstJsonObject(rawText);
			if (!jsonCandidate) {
				console.error('No JSON object found in model output', rawText);
				throw new Error('No JSON candidate');
			}

			try {
				const validated = JSON.parse(jsonCandidate) as T;
				// console.info('safeJsonBedrockQuery result: ', JSON.stringify(validated));
				return validated;
			} catch (err) {
				console.warn(`Attempt ${attempt} – Schema validation failed`, err);
				// fall through to retry
			}
		} catch (error) {
			console.warn(`Attempt ${attempt} failed`, error);
		}

		if (attempt >= maxAttempts) {
			console.error(`All ${maxAttempts} attempts failed`);
			throw new Error(`safeJsonBedrockQuery failed after ${maxAttempts} attempts`);
		}

		const baseDelay = 10000;
		// I do this to avoid multiple retries same at once
		const jitter = Math.random() * Math.min(50000, baseDelay * 2 ** attempt);
		await new Promise(res => setTimeout(res, jitter));
	}

	// Technically unreachable due to throw
	return {} as T;
};