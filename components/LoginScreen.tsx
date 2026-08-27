"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { Database, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!hasSupabaseConfig) return;
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError("Email hoặc mật khẩu không đúng.");
    setLoading(false);
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-watermark" />
        <div className="brand-content">
          <div className="brand-logo-wrap">
            <Image src="/logo-ha-hoa.jpg" alt="Hà Hoà" width={112} height={112} priority />
          </div>
          <p className="eyebrow light">NPP HÀ HOÀ</p>
          <h1>Quản lý công nợ<br />nhẹ nhàng hơn.</h1>
          <p>Theo dõi khoản nợ, thanh toán và hàng thu hồi trên một nguồn dữ liệu duy nhất.</p>
          <div className="login-feature">
            <Database size={19} />
            <span>Dữ liệu đồng bộ và bảo vệ bởi Supabase</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <p className="eyebrow">HỆ THỐNG NỘI BỘ</p>
          <h2>Đăng nhập</h2>
          <p className="muted">Sử dụng tài khoản được quản trị viên cấp.</p>

          {!hasSupabaseConfig && (
            <div className="setup-notice">
              <strong>Chưa kết nối Supabase</strong>
              <span>Sao chép <code>.env.example</code> thành <code>.env.local</code> và điền URL/anon key.</span>
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <div className="input-icon">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@hahoanpp.vn"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <div className="input-icon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button className="icon-button input-action" type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện mật khẩu">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}
          <button className="primary-button login-button" type="submit" disabled={loading || !hasSupabaseConfig}>
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
