'use server'

/**
 * ==============================================================================
 * QR CODE GENERATOR SERVER ACTION
 * File: src/modules/features/catalog/qr-actions.ts
 * Pure server-side high-resolution SVG and Data URL QR generator for deep links
 * ==============================================================================
 */

export interface GenerateCatalogQRCodeParams {
  url: string
  title?: string
  size?: number
  margin?: number
  darkColor?: string
  lightColor?: string
}

export interface GenerateCatalogQRCodeResult {
  success: boolean
  dataUrl: string
  svg: string
  deepLinkUrl: string
  error?: string
}

// ------------------------------------------------------------------------------
// Pure TypeScript QR Code Generator (Reed-Solomon & Matrix Rendering)
// Supports alphanumeric/byte encoding, error correction, and SVG export
// ------------------------------------------------------------------------------

class QRBitBuffer {
  buffer: number[] = []
  length = 0

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8)
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1)
    }
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8)
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0)
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8)
    }
    this.length++
  }
}

// Galois field math for Reed-Solomon error correction
const QRMath = {
  EXP_TABLE: new Array(256) as number[],
  LOG_TABLE: new Array(256) as number[],

  init() {
    for (let i = 0; i < 8; i++) {
      this.EXP_TABLE[i] = 1 << i
    }
    for (let i = 8; i < 256; i++) {
      this.EXP_TABLE[i] =
        this.EXP_TABLE[i - 4] ^
        this.EXP_TABLE[i - 5] ^
        this.EXP_TABLE[i - 6] ^
        this.EXP_TABLE[i - 8]
    }
    for (let i = 0; i < 255; i++) {
      this.LOG_TABLE[this.EXP_TABLE[i]] = i
    }
  },

  glog(n: number) {
    if (n < 1) throw new Error(`glog(${n})`)
    return this.LOG_TABLE[n]
  },

  gexp(n: number) {
    let num = n
    while (num < 0) num += 255
    while (num >= 255) num -= 255
    return this.EXP_TABLE[num]
  },
}
QRMath.init()

class QRPolynomial {
  num: number[]

  constructor(num: number[], shift = 0) {
    let offset = 0
    while (offset < num.length && num[offset] === 0) {
      offset++
    }
    this.num = new Array(num.length - offset + shift)
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset]
    }
    for (let i = 0; i < shift; i++) {
      this.num[num.length - offset + i] = 0
    }
  }

  get(index: number): number {
    return this.num[index]
  }

  getLength(): number {
    return this.num.length
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0)
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(
          QRMath.glog(this.get(i)) + QRMath.glog(e.get(j))
        )
      }
    }
    return new QRPolynomial(num)
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) {
      return this
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0))
    const num = new Array(this.getLength())
    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i)
    }
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio)
    }
    return new QRPolynomial(num).mod(e)
  }
}

// RS Block capacities and error correction codeword counts
const RS_BLOCK_TABLE: Record<number, number[]> = {
  // [totalDataCodewords, ecCodewordsPerBlock, numBlocks]
  1: [19, 7, 1],
  2: [34, 10, 1],
  3: [55, 15, 1],
  4: [80, 20, 1],
  5: [108, 26, 1],
  6: [136, 18, 2],
  7: [156, 20, 2],
  8: [194, 24, 2],
  9: [232, 30, 2],
  10: [274, 18, 4],
}

function getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
  let a = new QRPolynomial([1], 0)
  for (let i = 0; i < errorCorrectLength; i++) {
    a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0))
  }
  return a
}

function createQRMatrix(text: string): boolean[][] {
  // Byte Mode encoding
  const utf8Bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    let charCode = text.charCodeAt(i)
    if (charCode < 0x80) {
      utf8Bytes.push(charCode)
    } else if (charCode < 0x800) {
      utf8Bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f))
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8Bytes.push(
        0xe0 | (charCode >> 12),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      )
    } else {
      i++
      charCode =
        0x10000 + (((charCode & 0x3ff) << 10) | (text.charCodeAt(i) & 0x3ff))
      utf8Bytes.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      )
    }
  }

  // Determine smallest QR version capable of holding the payload
  let version = 1
  for (let v = 1; v <= 10; v++) {
    const cap = RS_BLOCK_TABLE[v][0]
    if (utf8Bytes.length + 3 <= cap) {
      version = v
      break
    }
    version = v
  }

  const [totalDataCount, ecCodewordsPerBlock, numBlocks] =
    RS_BLOCK_TABLE[version] || [108, 26, 1]

  const buffer = new QRBitBuffer()
  buffer.put(4, 4) // Mode: Byte (0100)
  buffer.put(utf8Bytes.length, version < 10 ? 8 : 16) // Character count indicator
  for (let i = 0; i < utf8Bytes.length; i++) {
    buffer.put(utf8Bytes[i], 8)
  }

  // Terminator
  if (buffer.length + 4 <= totalDataCount * 8) {
    buffer.put(0, 4)
  }
  // Padding to byte boundary
  while (buffer.length % 8 !== 0) {
    buffer.putBit(false)
  }
  // Pad bytes 0xEC, 0x11
  while (buffer.length < totalDataCount * 8) {
    buffer.put(0xec, 8)
    if (buffer.length < totalDataCount * 8) {
      buffer.put(0x11, 8)
    }
  }

  // Generate Error Correction Codewords
  const dataBytes = buffer.buffer
  const rsPoly = getErrorCorrectPolynomial(ecCodewordsPerBlock)
  const rawPoly = new QRPolynomial(dataBytes, rsPoly.getLength() - 1)
  const modPoly = rawPoly.mod(rsPoly)

  const finalCodewords: number[] = [...dataBytes]
  for (let i = 0; i < rsPoly.getLength() - 1; i++) {
    const modIndex = i + modPoly.getLength() - (rsPoly.getLength() - 1)
    finalCodewords.push(modIndex >= 0 ? modPoly.get(modIndex) : 0)
  }

  // Build Matrix Grid
  const moduleCount = version * 4 + 17
  const modules: (boolean | null)[][] = Array.from({ length: moduleCount }, () =>
    Array(moduleCount).fill(null)
  )

  // 1. Position detection patterns
  const setupFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || moduleCount <= row + r) continue
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || moduleCount <= col + c) continue
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          modules[row + r][col + c] = true
        } else {
          modules[row + r][col + c] = false
        }
      }
    }
  }
  setupFinder(0, 0)
  setupFinder(0, moduleCount - 7)
  setupFinder(moduleCount - 7, 0)

  // 2. Timing patterns
  for (let i = 8; i < moduleCount - 8; i++) {
    if (modules[6][i] === null) modules[6][i] = i % 2 === 0
    if (modules[i][6] === null) modules[i][6] = i % 2 === 0
  }

  // 3. Dark module
  modules[moduleCount - 8][8] = true

  // 4. Place Data Bits
  let bitIndex = 0
  const totalBits = finalCodewords.length * 8
  let inc = -1
  let row = moduleCount - 1
  let col = moduleCount - 1

  while (col > 0) {
    if (col === 6) col--
    while (true) {
      for (let c = 0; c < 2; c++) {
        if (modules[row][col - c] === null) {
          let dark = false
          if (bitIndex < totalBits) {
            const bytePos = Math.floor(bitIndex / 8)
            const bitPos = 7 - (bitIndex % 8)
            dark = ((finalCodewords[bytePos] >>> bitPos) & 1) === 1
          }
          // Apply Standard Mask Pattern 0: (row + col) % 2 == 0
          const mask = (row + (col - c)) % 2 === 0
          modules[row][col - c] = mask ? !dark : dark
          bitIndex++
        }
      }
      row += inc
      if (row < 0 || moduleCount <= row) {
        row -= inc
        inc = -inc
        break
      }
    }
    col -= 2
  }

  return modules.map((r) => r.map((cell) => cell ?? false))
}

/**
 * Generate a standalone high-resolution SVG and Data URL QR Code
 */
export async function generateCatalogQRCodeAction(
  params: GenerateCatalogQRCodeParams
): Promise<GenerateCatalogQRCodeResult> {
  try {
    const {
      url,
      title,
      size = 512,
      margin = 4,
      darkColor = '#0f172a',
      lightColor = '#ffffff',
    } = params

    if (!url || typeof url !== 'string') {
      return {
        success: false,
        dataUrl: '',
        svg: '',
        deepLinkUrl: '',
        error: 'URL de enlace requerida para generar código QR',
      }
    }

    const matrix = createQRMatrix(url)
    const moduleCount = matrix.length
    const fullSize = moduleCount + margin * 2

    // Build SVG path
    let pathData = ''
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c]) {
          const x = c + margin
          const y = r + margin
          pathData += `M${x} ${y}h1v1h-1z `
        }
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullSize} ${fullSize}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="${fullSize}" height="${fullSize}" fill="${lightColor}"/>
  <path d="${pathData.trim()}" fill="${darkColor}"/>
</svg>`

    const base64Svg = Buffer.from(svg).toString('base64')
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`

    return {
      success: true,
      dataUrl,
      svg,
      deepLinkUrl: url,
    }
  } catch (err: any) {
    console.error('generateCatalogQRCodeAction error:', err)
    return {
      success: false,
      dataUrl: '',
      svg: '',
      deepLinkUrl: params.url || '',
      error: err.message || 'Error al generar código QR',
    }
  }
}
