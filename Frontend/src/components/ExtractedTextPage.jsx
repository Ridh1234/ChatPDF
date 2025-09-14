import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ExtractedTextPage.css';

function ExtractedTextPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [expandedPages, setExpandedPages] = useState(new Set());

  // Get batch results from navigation state or localStorage
  const batchResults = location.state?.batchResults || JSON.parse(localStorage.getItem('batchResults') || 'null');

  if (!batchResults || !batchResults.processed_files || batchResults.processed_files.length === 0) {
    return (
      <div className="extracted-text-page">
        <div className="no-results">
          <h2>No Extracted Text Available</h2>
          <p>Please process some PDF files first to view extracted text.</p>
          <button 
            onClick={() => navigate('/')} 
            className="back-btn"
          >
            ← Back to Upload
          </button>
        </div>
      </div>
    );
  }

  const toggleFileExpansion = (filename) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
      // Also collapse all pages for this file
      const newExpandedPages = new Set(expandedPages);
      batchResults.processed_files.forEach(file => {
        if (file.filename === filename && file.extracted_content?.pages) {
          file.extracted_content.pages.forEach(page => {
            newExpandedPages.delete(`${filename}-${page.page}`);
          });
        }
      });
      setExpandedPages(newExpandedPages);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const togglePageExpansion = (fileKey) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(fileKey)) {
      newExpanded.delete(fileKey);
    } else {
      newExpanded.add(fileKey);
    }
    setExpandedPages(newExpanded);
  };

  const formatTextContent = (text) => {
    if (!text || text.trim() === '') {
      return <em className="no-text">No text extracted from this page</em>;
    }
    
    // Split text into paragraphs and format
    const paragraphs = text.split('\n').filter(p => p.trim());
    
    if (paragraphs.length === 0) {
      return <em className="no-text">No text extracted from this page</em>;
    }

    return (
      <div className="text-content">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-paragraph">
            {paragraph}
          </p>
        ))}
      </div>
    );
  };

  const renderTables = (tables) => {
    if (!tables || tables.length === 0) {
      return null;
    }

    return (
      <div className="tables-section">
        <h5>Tables Found ({tables.length}):</h5>
        {tables.map((tableInfo, tableIndex) => {
          // Handle both old format (array of arrays) and new format (object with data property)
          const tableData = tableInfo.data || tableInfo;
          const extractionMethod = tableInfo.extraction_method || 'unknown';
          const source = tableInfo.source || extractionMethod || 'unknown';
          const confidence = tableInfo.confidence;
          const rowCount = tableInfo.row_count || (tableData ? tableData.length : 0);
          const columnCount = tableInfo.column_count || (tableData && tableData[0] ? tableData[0].length : 0);
          
          // Get source display name and styling
          const getSourceInfo = (source) => {
            switch(source.toLowerCase()) {
              case 'gmft':
                return { name: 'GMFT', class: 'source-gmft', priority: 'primary' };
              case 'img2table':
                return { name: 'img2table', class: 'source-img2table', priority: 'secondary' };
              case 'pdfplumber':
                return { name: 'pdfplumber', class: 'source-pdfplumber', priority: 'fallback' };
              case 'text_pattern':
                return { name: 'Text Pattern', class: 'source-text', priority: 'fallback' };
              case 'camelot_stream':
              case 'camelot_lattice':
                return { name: source.replace('_', ' '), class: 'source-camelot', priority: 'fallback' };
              default:
                return { name: source, class: 'source-unknown', priority: 'fallback' };
            }
          };

          const sourceInfo = getSourceInfo(source);
          
          if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
            return (
              <div key={tableIndex} className="table-wrapper">
                <div className="table-info">
                  <span className="table-meta">Table {tableIndex + 1} - No data available</span>
                  <span className={`source-badge ${sourceInfo.class}`}>
                    {sourceInfo.name}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={tableIndex} className="table-wrapper">
              <div className="table-info">
                <div className="table-meta-row">
                  <span className="table-meta">
                    Table {tableIndex + 1} - {rowCount} rows × {columnCount} columns
                    {confidence && ` (${Math.round(confidence * 100)}% confidence)`}
                  </span>
                  <span className={`source-badge ${sourceInfo.class} ${sourceInfo.priority}`}>
                    {sourceInfo.priority === 'primary' ? '🚀 ' : 
                     sourceInfo.priority === 'secondary' ? '⚡ ' : 
                     '📄 '}
                    {sourceInfo.name}
                  </span>
                </div>
              </div>
              <table className="data-table">
                <tbody>
                  {tableData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="extracted-text-page">
      <div className="page-header">
        <button 
          onClick={() => navigate('/')} 
          className="back-btn"
        >
          ← Back to Upload
        </button>
        <h1>Extracted Text Results</h1>
        <div className="summary-info">
          <span className="summary-item">
            <strong>Files Processed:</strong> {batchResults.processed_files.length}
          </span>
          <span className="summary-item">
            <strong>Total Pages:</strong> {batchResults.total_pages}
          </span>
          <span className="summary-item">
            <strong>Processing Time:</strong> {batchResults.total_duration_ms} ms
          </span>
          {/* Show table statistics if available */}
          {batchResults.processed_files.some(file => 
            file.extracted_content?.pages_with_tables || 
            file.extracted_content?.total_tables
          ) && (
            <>
              <span className="summary-item">
                <strong>Pages with Tables:</strong> {
                  batchResults.processed_files.reduce((total, file) => 
                    total + (file.extracted_content?.pages_with_tables?.length || 0), 0
                  )
                }
              </span>
              <span className="summary-item">
                <strong>Total Tables:</strong> {
                  batchResults.processed_files.reduce((total, file) => 
                    total + (file.extracted_content?.total_tables || 0), 0
                  )
                }
              </span>
            </>
          )}
        </div>
      </div>

      <div className="files-container">
        {batchResults.processed_files.map((file, fileIndex) => {
          const isFileExpanded = expandedFiles.has(file.filename);
          const hasContent = file.extracted_content && file.extracted_content.pages;
          
          return (
            <div key={fileIndex} className="file-section">
              <div 
                className={`file-header ${isFileExpanded ? 'expanded' : ''}`}
                onClick={() => toggleFileExpansion(file.filename)}
              >
                <div className="file-info">
                  <h3 className="file-name">{file.filename}</h3>
                  <div className="file-meta">
                    <span className="meta-item">Pages: {file.pages_count}</span>
                    <span className="meta-item">Size: {file.text_length} chars</span>
                    <span className="meta-item">Time: {file.duration_ms} ms</span>
                  </div>
                </div>
                <div className="expand-icon">
                  {isFileExpanded ? '▼' : '▶'}
                </div>
              </div>

              {isFileExpanded && hasContent && (
                <div className="file-content">
                  <div className="pages-container">
                    {file.extracted_content.pages.map((page, pageIndex) => {
                      const pageKey = `${file.filename}-${page.page}`;
                      const isPageExpanded = expandedPages.has(pageKey);
                      
                      return (
                        <div key={pageIndex} className="page-section">
                          <div 
                            className={`page-header ${isPageExpanded ? 'expanded' : ''}`}
                            onClick={() => togglePageExpansion(pageKey)}
                          >
                            <h4 className="page-title">
                              Page {page.page}
                              {page.has_tables && (
                                <span className="table-indicator">
                                  📊 {page.table_count || (page.tables ? page.tables.length : 0)} table{(page.table_count || (page.tables ? page.tables.length : 0)) !== 1 ? 's' : ''}
                                </span>
                              )}
                            </h4>
                            <div className="expand-icon">
                              {isPageExpanded ? '▼' : '▶'}
                            </div>
                          </div>

                          {isPageExpanded && (
                            <div className="page-content">
                              {formatTextContent(page.text)}
                              {page.tables && renderTables(page.tables)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isFileExpanded && !hasContent && (
                <div className="no-content">
                  <p>No extracted content available for this file.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {batchResults.failed_files && batchResults.failed_files.length > 0 && (
        <div className="failed-files-section">
          <h2>Failed Files</h2>
          <div className="failed-files">
            {batchResults.failed_files.map((failed, index) => (
              <div key={index} className="failed-item">
                <strong>{failed.filename}</strong>: {failed.error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExtractedTextPage;

 