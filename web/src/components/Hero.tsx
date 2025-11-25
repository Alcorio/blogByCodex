import { Link } from 'react-router-dom'

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-content container">
        <p className="eyebrow">PocketBase + React</p>
        <h1>写作、发布、讨论，都在一个干净的界面完成。</h1>
        <p className="muted">
          轻量后端、快速前端，带上评论、标签与创作面板，三分钟跑通你的个人博客。
        </p>
        <div className="hero-actions">
          <a className="primary-btn" href="#posts">
            浏览文章
          </a>
          <Link className="ghost-btn" to="/dashboard">
            去创作
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Hero
