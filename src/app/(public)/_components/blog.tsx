import Link from "next/link";
import { blogData } from "../_data/blog";

const Blog = () => {
  return (
    <div className="blog-area home-blog blog-grid default-padding bottom-less">
      <div className="container">
        <div className="row">
          <div className="col-lg-6 col-md-12 mb-30">
            {blogData.slice(0, 1).map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
          {blogData.slice(1, 3).map((blog) => (
            <div key={blog.id} className="col-lg-3 col-md-6 mb-30">
              <BlogCard blog={blog} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type BlogItem = {
  id: number;
  thumb: string;
  date: string;
  month: string;
  year: string;
  author: string;
  comments: number;
  title: string;
};

const BlogCard = ({ blog }: { blog: BlogItem }) => (
  <div className="blog-style-one">
    <div className="thumb">
      <Link href={`/blog-single-with-sidebar/${blog.id}`}>
        <img src={`/assets/img/blog/${blog.thumb}`} alt={blog.title} />
      </Link>
      <div className="date">
        <strong>{blog.date}</strong>{" "}
        <span>
          {blog.month}, {blog.year}
        </span>
      </div>
    </div>
    <div className="info">
      <div className="meta">
        <ul>
          <li>
            <Link href="#">
              <i className="fas fa-user-circle" /> {blog.author}
            </Link>
          </li>
          <li>
            <Link href="#">
              <i className="fas fa-comments" /> {blog.comments} Comments
            </Link>
          </li>
        </ul>
      </div>
      <h4 className="title">
        <Link href={`/blog-single-with-sidebar/${blog.id}`}>{blog.title}</Link>
      </h4>
    </div>
  </div>
);

export default Blog;
