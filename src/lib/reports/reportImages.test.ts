import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_REPORT_IMAGES,
  REPORT_IMAGE_MAX_BYTES,
  describeReportImageFile,
  isReportId,
  assignResultImageSlots,
  reportImageFileNames,
  reportImageObjectPath,
  reportImageStoragePath,
} from './reportImages'

const REPORT_ID = '97efa8ef-de43-491c-9c9f-bdd21a7dbb17'

describe('describeReportImageFile', () => {
  it('accepts png, jpeg and webp content types', () => {
    assert.deepEqual(describeReportImageFile('image/png', 'foto.png'), {
      extension: 'png',
      contentType: 'image/png',
    })
    assert.deepEqual(describeReportImageFile('image/jpeg', 'foto.jpeg'), {
      extension: 'jpg',
      contentType: 'image/jpeg',
    })
    assert.deepEqual(describeReportImageFile('image/webp;charset=binary', 'foto.webp'), {
      extension: 'webp',
      contentType: 'image/webp',
    })
  })

  it('falls back to the filename when the browser omits the content type', () => {
    assert.deepEqual(describeReportImageFile('', 'muestra.JPEG'), {
      extension: 'jpg',
      contentType: 'image/jpeg',
    })
  })

  it('rejects other formats', () => {
    assert.equal(describeReportImageFile('image/gif', 'foto.gif'), null)
    assert.equal(describeReportImageFile('image/svg+xml', 'foto.svg'), null)
    assert.equal(describeReportImageFile('', 'foto.pdf'), null)
  })
})

describe('report image storage paths', () => {
  it('builds a numbered file inside the report folder', () => {
    assert.equal(reportImageStoragePath(REPORT_ID, 1, 'jpg'), `${REPORT_ID}/01.jpg`)
    assert.equal(reportImageStoragePath(REPORT_ID, 3, 'webp'), `${REPORT_ID}/03.webp`)
  })

  it('joins a listed file name onto the report folder', () => {
    assert.equal(reportImageObjectPath(REPORT_ID, '01.jpg'), `${REPORT_ID}/01.jpg`)
  })

  it('rejects a report id or index outside the allowed range', () => {
    assert.equal(isReportId('../etc'), false)
    assert.throws(() => reportImageStoragePath('../etc', 1, 'png'))
    assert.throws(() => reportImageStoragePath(REPORT_ID, 0, 'png'))
    assert.throws(() => reportImageStoragePath(REPORT_ID, MAX_REPORT_IMAGES + 1, 'png'))
    assert.throws(() => reportImageObjectPath(REPORT_ID, '../01.jpg'))
  })
})

describe('reportImageFileNames', () => {
  it('keeps real files, drops folders and placeholders, and sorts by name', () => {
    assert.deepEqual(
      reportImageFileNames([
        { name: '03.webp', id: 'c' },
        { name: '01.jpg', id: 'a' },
        { name: '.emptyFolderPlaceholder', id: 'p' },
        { name: 'nested', id: null },
      ]),
      ['01.jpg', '03.webp']
    )
  })
})

describe('assignResultImageSlots', () => {
  it('fills the lowest free positions and keeps occupied ones', () => {
    assert.deepEqual(assignResultImageSlots(['02.jpg'], 1), [1])
    assert.deepEqual(assignResultImageSlots(['01.png', '02.jpg'], 1), [3])
    assert.deepEqual(assignResultImageSlots([], 2), [1, 2])
  })

  it('rejects a set larger than three images', () => {
    assert.throws(() => assignResultImageSlots(['01.png', '02.jpg', '03.webp'], 1))
  })
})

describe('REPORT_IMAGE_MAX_BYTES', () => {
  it('caps each image at 5 MB', () => {
    assert.equal(REPORT_IMAGE_MAX_BYTES, 5 * 1024 * 1024)
  })
})
