"use client";

const DATE_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function AdminDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // iPad Safariの標準日付入力は表示が乱れるため、表示と手入力は文字欄で行う。
  // カレンダーは、ボタンの上に透明の日付入力を重ね、ユーザーの直接タップで開かせる
  // （showPicker()による代理オープンはiPad Safariで機能しない）。
  const calendarValue = DATE_VALUE_PATTERN.test(value) ? value : "";

  return (
    <label className="field-label admin-date-picker">
      {label}
      <span className="admin-date-picker-control">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{4}-\d{2}-\d{2}"
          placeholder="YYYY-MM-DD"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="admin-date-picker-button">
          カレンダー
          <input
            className="admin-date-picker-overlay"
            type="date"
            value={calendarValue}
            aria-label={`${label}をカレンダーで選ぶ`}
            onChange={(event) => onChange(event.target.value)}
            onClick={(event) => {
              // デスクトップブラウザでは、タップだけでは開かないことがあるため補助する。
              // 対応していないブラウザでは静かに何もしない（iPadはタップ自体で開く）。
              try {
                (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
              } catch {
                // 直接タップによる標準動作に任せる
              }
            }}
          />
        </span>
      </span>
    </label>
  );
}
