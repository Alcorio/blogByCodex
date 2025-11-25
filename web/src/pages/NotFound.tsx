import { Link } from 'react-router-dom'

const NotFound = () => (
  <div className="container center">
    <div className="card">
      <h2>页面不存在</h2>
      <p className="muted">返回首页继续浏览。</p>
      <Link className="primary-btn" to="/">
        回首页
      </Link>
    </div>
  </div>
)

export default NotFound
