export type NullableBoundingBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
} | null;

export interface TextElement {
  text: string;
  boundingBox: NullableBoundingBox;
}

export interface TextLine {
  text: string;
  boundingBox: NullableBoundingBox;
  elements: TextElement[];
}

export interface TextBlock {
  text: string;
  boundingBox: NullableBoundingBox;
  lines: TextLine[];
}

export interface TextRecognitionResult {
  text: string;
  blocks: TextBlock[];
}