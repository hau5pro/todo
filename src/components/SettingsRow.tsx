export function SettingsRow({ label, sublabel, checked, onChange }: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="settings-row">
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', fontFamily: 'var(--mono)', marginTop: '0.15rem' }}>{sublabel}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`toggle-btn${checked ? ' toggle-btn--on' : ''}`}
      />
    </div>
  );
}
