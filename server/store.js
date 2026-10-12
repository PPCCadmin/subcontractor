// server/store.js
// -----------------------------------------------------------------------------
// Saved subcontractor edits. Each edited or newly created subcontractor is
// stored as one JSON document keyed by its id; the original seed data in
// subcontractors.json is never modified.
//
//   AZURE_STORAGE_CONNECTION_STRING set -> Azure Blob Storage (production)
//   DATA_DIR set                        -> JSON files in that folder (local dev,
//                                          or an Azure Files mount)
//   neither                             -> saving disabled, app is read-only
// -----------------------------------------------------------------------------

import fs from 'node:fs/promises'
import path from 'node:path'
import { BlobServiceClient } from '@azure/storage-blob'

export class ConflictError extends Error {}

const blobName = id => `subs/${encodeURIComponent(id)}.json`

async function mapLimit(items, limit, fn) {
  const results = []
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

function blobStore(connectionString, containerName) {
  const container = BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName)
  let ready = null
  const init = () => (ready ||= container.createIfNotExists())

  const read = async name => {
    const blob = container.getBlockBlobClient(name)
    try {
      const buffer = await blob.downloadToBuffer()
      const props = await blob.getProperties()
      return { sub: JSON.parse(buffer.toString('utf8')), etag: props.etag }
    } catch (error) {
      if (error.statusCode === 404) return null
      throw error
    }
  }

  return {
    kind: 'azure-blob',
    async list() {
      await init()
      const names = []
      for await (const item of container.listBlobsFlat({ prefix: 'subs/' })) names.push(item.name)
      const docs = await mapLimit(names, 16, read)
      return docs.filter(Boolean).map(doc => doc.sub)
    },
    async get(id) {
      await init()
      return read(blobName(id))
    },
    // etag: undefined = overwrite, null = must not exist yet, string = must match
    async put(id, sub, etag) {
      await init()
      const conditions = etag === null ? { ifNoneMatch: '*' } : etag ? { ifMatch: etag } : undefined
      const body = JSON.stringify(sub)
      try {
        await container.getBlockBlobClient(blobName(id)).upload(body, Buffer.byteLength(body), {
          blobHTTPHeaders: { blobContentType: 'application/json' },
          conditions,
        })
      } catch (error) {
        if (error.statusCode === 412 || error.statusCode === 409) throw new ConflictError('Changed by someone else')
        throw error
      }
    },
  }
}

function fileStore(dir) {
  const file = id => path.join(dir, `${encodeURIComponent(id)}.json`)
  const read = async target => {
    try {
      const text = await fs.readFile(target, 'utf8')
      return { sub: JSON.parse(text), etag: String((await fs.stat(target)).mtimeMs) }
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  return {
    kind: 'files',
    async list() {
      await fs.mkdir(dir, { recursive: true })
      const names = (await fs.readdir(dir)).filter(name => name.endsWith('.json'))
      const docs = await Promise.all(names.map(name => read(path.join(dir, name))))
      return docs.filter(Boolean).map(doc => doc.sub)
    },
    async get(id) {
      return read(file(id))
    },
    async put(id, sub, etag) {
      await fs.mkdir(dir, { recursive: true })
      if (etag !== undefined) {
        const current = await read(file(id))
        if ((etag === null && current) || (etag && current?.etag !== etag)) throw new ConflictError('Changed by someone else')
      }
      await fs.writeFile(file(id), JSON.stringify(sub))
    },
  }
}

export function createStore() {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return blobStore(process.env.AZURE_STORAGE_CONNECTION_STRING, process.env.STORAGE_CONTAINER || 'subcontractors')
  }
  if (process.env.DATA_DIR) return fileStore(path.resolve(process.env.DATA_DIR))
  return null
}
