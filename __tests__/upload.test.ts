import * as upload from '../src/upload'
import * as fs from 'fs'
import { mocked } from 'ts-jest/utils'

jest.spyOn(upload, 'uploadBlob')

const mockedUploadBlob = mocked(upload.uploadBlob, true)
const FILENAME = 'message.txt'
const FILENAME2 = 'message2.txt'

describe('upload-azure-blob => upload.ts', () => {
  const client = jest.fn()

  beforeAll(async () => {
    const data = new Uint8Array(Buffer.from('Hello Node.js'));
    await fs.promises.writeFile(FILENAME, data);
    await fs.promises.writeFile(FILENAME2, data);
  })

  test('uploadBlobs calls uploadBlob with one file', async () => {
    await upload.uploadBlobs(<any>client, 'message.txt')
    expect(mockedUploadBlob.mock.calls.length).toBe(1)
  })

  test('uploadBlobs calls uploadBlob with two files', async () => {
    await upload.uploadBlobs(<any>client, 'message*.txt')
    expect(mockedUploadBlob.mock.calls.length).toBe(2)
  })

  test('uploadBlobs doesn\'t call uploadBlob with zero files', async () => {
    await upload.uploadBlobs(<any>client, 'bananas.txt')
    expect(mockedUploadBlob.mock.calls.length).toBe(0)
  })

  afterAll(async () => {
    await fs.promises.rm(FILENAME);
    await fs.promises.rm(FILENAME2);
  })
})