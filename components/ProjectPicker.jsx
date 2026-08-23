import { FileIcon } from '../icons/FileIcon.jsx'
import { FolderIcon } from '../icons/FolderIcon.jsx'
import { LiquidGlass } from './LiquidGlass.jsx'
import { FileReview } from './FileReview.jsx'

export function ProjectPicker({ uploader }) {
  const {
    items,
    prefix, setPrefix,
    emptyFolder, setEmptyFolder,
    reviewOpen, setReviewOpen,
    dragging, setDragging,
    validation,
    folders,
    generatedCount,
    fileInputRef,
    folderInputRef,
    consumePicker,
    openFiles,
    openFolder,
    clearFiles,
    addVirtualFolder,
    updateItemPath,
    removeItem,
    handleDrop,
  } = uploader

  const summary = !items.length
    ? { tone: 'empty', mark: '+', title: 'No files selected', meta: 'Choose files, a folder, or drop a project.' }
    : validation.ok
      ? {
          tone: 'ok',
          mark: '✓',
          title: `${items.length} file${items.length === 1 ? '' : 's'} ready`,
          meta: [
            folders ? `${folders} folder${folders === 1 ? '' : 's'}` : '',
            'paths organized',
            generatedCount ? `${generatedCount} support file${generatedCount === 1 ? '' : 's'}` : '',
          ].filter(Boolean).join(' • '),
        }
      : {
          tone: 'bad',
          mark: '!',
          title: 'Review path conflicts',
          meta: 'Two files only conflict when their complete GitHub paths match.',
        }

  return (
    <section className="panel project-panel">
      <div className="section-title">
        <span className="step-chip">2</span>
        <h2>Add project</h2>
      </div>

      <div className="import-toolbar">
        <LiquidGlass className="import-glass" variant="regular" radius={20}>
          <div className="import-buttons" role="group" aria-label="Add project">
            <button type="button" onClick={openFiles}>
              <FileIcon />
              <span>Choose Files</span>
            </button>
            <span className="import-divider" aria-hidden="true" />
            <button type="button" onClick={openFolder}>
              <FolderIcon />
              <span>Folder</span>
            </button>
          </div>
        </LiquidGlass>
        <button type="button" className="danger-text" onClick={clearFiles}>Clear</button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onInput={(event) => consumePicker(event.currentTarget)}
          onChange={(event) => consumePicker(event.currentTarget)}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          webkitdirectory=""
          directory=""
          onInput={(event) => consumePicker(event.currentTarget)}
          onChange={(event) => consumePicker(event.currentTarget)}
        />
      </div>

      <div
        className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
        onDrop={handleDrop}
      >
        <strong>Drop files or folders here</strong>
        <span>Or use the controls above.</span>
      </div>

      <div className="auto-organize"><span className="green-dot" />Auto-organize &amp; safe repair on</div>

      <details className="options-panel">
        <summary>Options</summary>
        <div className="options-grid">
          <label>
            <span>Destination prefix <small>(optional)</small></span>
            <input value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="Repository root" />
          </label>
          <label>
            <span>Add empty folder <small>(.gitkeep)</small></span>
            <div className="inline-input-action">
              <input value={emptyFolder} onChange={(event) => setEmptyFolder(event.target.value)} placeholder="textures" />
              <button type="button" className="secondary-button compact-button" onClick={addVirtualFolder}>Add</button>
            </div>
          </label>
        </div>
      </details>

      <div className={`selection-summary selection-summary--${summary.tone}`}>
        <span className="selection-mark">{summary.mark}</span>
        <div>
          <strong>{summary.title}</strong>
          <span>{summary.meta}</span>
        </div>
        {!!items.length && <span className="auto-badge">Auto</span>}
      </div>

      {!!items.length && !validation.ok && (
        <div className="validation-message">
          {validation.duplicates.length ? `Path conflict: ${validation.duplicates.join(', ')}. ` : ''}
          {validation.empty.length ? `${validation.empty.length} file(s) need a destination path.` : ''}
        </div>
      )}

      <FileReview
        items={items}
        prefix={prefix}
        validation={validation}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onUpdatePath={updateItemPath}
        onRemove={removeItem}
      />
    </section>
  )
}
