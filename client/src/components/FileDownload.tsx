import type { FileInfo } from '../types';
import { downloadFileUrl } from '../api/client';
import './FileDownload.css';

interface Props {
  automationId: string;
  files: FileInfo[];
}

export function FileDownload({ automationId, files }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="file-download">
      <h3 className="file-download__title">Output Files</h3>
      <ul className="file-download__list">
        {files.map((file) => (
          <li key={file.path} className="file-download__item">
            <a
              href={downloadFileUrl(automationId, file.path)}
              download={file.name}
              className="file-download__link"
            >
              <span className="file-download__icon">&#128196;</span>
              <span className="file-download__name">{file.path}</span>
              <span className="file-download__size">{formatSize(file.size)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
