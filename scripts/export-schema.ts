import { mkdir, writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { graphSchema } from '../shared/schema.ts'

await mkdir(new URL('../schema/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../schema/knowledge.schema.json', import.meta.url),
  `${JSON.stringify(z.toJSONSchema(graphSchema, { io: 'input' }), null, 2)}\n`,
)
