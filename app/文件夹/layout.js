export const metadata = {
  title: '情绪觉察 × 课题分离',
  description: '从情绪内耗到清晰行动，让冲突不再失控',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
