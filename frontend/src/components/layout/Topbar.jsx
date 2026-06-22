export default function Topbar({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-navy-100 sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-navy-900">{title}</h1>
        {subtitle && <p className="text-sm text-navy-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
