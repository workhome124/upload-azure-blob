import * as core from '@actions/core'
import { DefaultAzureCredential } from '@azure/identity'
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { promises as fsPromises } from 'fs'
import { promisify } from 'util'
import g from 'glob'

export interface Inputs {
  account: string
  destination: string
  source: string
}

export interface Output {
  filename?: string
  url?: string
}

export const getInputs = (): Inputs => {
  const inputs = {
    account: core.getInput('account', { required: true }),
    destination: core.getInput('destination', { required: true }),
    source: core.getInput('source', { required: true })
  }
  core.debug(`Received inputs: ${JSON.stringify(inputs)}`)

  return inputs
}

// Use default Azure credentials to instantiate new client.
// Read more:
//  https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/identity/identity/README.md#defaultazurecredential
//  https://www.npmjs.com/package/@azure/storage-blob
export const getBlobServiceClient = (account: string): BlobServiceClient => {
  core.debug(`Getting blob service client for account ${account}}`)

  const defaultAzureCredential = new DefaultAzureCredential()
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    defaultAzureCredential
  )

  return blobServiceClient
}

// Upload `filename` to Azure Blob Storage using authenticated `client`
export const uploadBlob = async (client: ContainerClient, filename: string): Promise<Output> => {
  core.debug(`Reading file ${filename}`)

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!client.containerName || !filename) {
    return {}
  }

  const file = await fsPromises.readFile(filename, 'utf-8')
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  let output: Output = {} as Output

  core.debug(`${filename} contents: ${file}`)

  // Create or update blob with name `filename`
  const response = await client.uploadBlockBlob(filename, file, file.length)
  const errorCode = response.response.errorCode

  // Continue upon upload error
  if (typeof errorCode !== 'undefined') {
    core.warning(`Error ${errorCode} uploading ${filename}.`)
  } else {
    const url = response.blockBlobClient.url
    core.info(`Successfully uploaded ${filename} to ${url}`)
    output = {
      filename,
      url
    }
  }

  return output
}

// Upload files defined by `pattern` to Azure Blob Storage using authenticated `client`
export const uploadBlobs = async (client: ContainerClient, pattern: string): Promise<Output[]> => {
  core.debug(`Getting files: ${pattern}...`)

  const glob = promisify(g)
  const filenames = await glob(pattern)

  core.debug(`filenames: ${JSON.stringify(filenames)}`)
  if (filenames.length === 0) {
    core.warning(`No files found for input source = ${pattern}`)
  }
  const outputs: Output[] = await Promise.all(filenames.map(async (filename) => await uploadBlob(client, filename)))

  return outputs
}
