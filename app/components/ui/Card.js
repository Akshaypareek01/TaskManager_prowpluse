/**
 * Panel primitives. `Panel` is the page-level container (rounded-2xl, shadow-sm);
 * `card` in globals.css is the smaller item-level surface.
 */

/**
 * @param {{ as?: any, className?: string, children: React.ReactNode }} props
 */
export function Panel({ as: Tag = "section", className = "", children, ...rest }) {
  return (
    <Tag className={`panel ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Header row for a Panel: title on the left, optional actions on the right.
 * @param {{ title: React.ReactNode, description?: React.ReactNode, actions?: React.ReactNode, id?: string, className?: string }} props
 */
export function PanelHeader({ title, description, actions, id, className = "" }) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5 ${className}`}
    >
      <div className="min-w-0">
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {description && <p className="meta mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * @param {{ className?: string, children: React.ReactNode }} props
 */
export function PanelBody({ className = "", children }) {
  return <div className={`px-4 py-4 sm:px-5 ${className}`}>{children}</div>;
}
