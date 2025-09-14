"use client";

import React, { useState } from "react";
import ForgeForm from "../components/ForgeForm";

export default function Page() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Teknovashop Forge</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Generador paramétrico (v1). Cable Tray listo; VESA y Router Mount llegarán en la siguiente iteración.
      </p>
      <ForgeForm />
    </main>
  );
}
