import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', author: '', cover_url: '' });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/articles`);
      setArticles(res.data);
    } catch (error) {
      console.error('Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (article) => {
    setFormData({
      title: article.title,
      content: article.content,
      author: article.author || '',
      cover_url: article.cover_url || ''
    });
    setEditingId(article.ID);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this article?')) {
      try {
        await axios.delete(`${window.location.protocol}//${window.location.hostname}:3000/api/articles/${id}`);
        fetchArticles();
      } catch (error) {
        alert('Failed to delete article');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${window.location.protocol}//${window.location.hostname}:3000/api/articles/${editingId}`, formData);
      } else {
        await axios.post(`${window.location.protocol}//${window.location.hostname}:3000/api/articles`, formData);
      }
      setShowModal(false);
      setFormData({ title: '', content: '', author: '', cover_url: '' });
      setEditingId(null);
      fetchArticles();
    } catch (error) {
      alert('Failed to save article');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('image', file);

    try {
      const res = await axios.post(`${window.location.protocol}//${window.location.hostname}:3000/api/articles/upload-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, cover_url: res.data.url });
    } catch (error) {
      alert('Failed to upload cover image');
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'align',
    'link', 'image'
  ];

  if (loading) return <div className="p-8 text-slate-500">Loading articles...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Articles & Blog</h1>
          <p className="text-slate-500 mt-2">Manage articles to be displayed on the public homepage.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ title: '', content: '', author: '', cover_url: '' });
            setEditingId(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
        >
          <Plus size={18} /> Create Article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <div key={article.ID} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="h-48 bg-slate-100 relative">
              {article.cover_url ? (
                <img src={article.cover_url} alt="Cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={48} />
                </div>
              )}
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2">{article.title}</h3>
              <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-3">
                {article.content
                  .replace(/&nbsp;/gi, ' ')
                  .replace(/&amp;/gi, '&')
                  .replace(/&lt;/gi, '<')
                  .replace(/&gt;/gi, '>')
                  .replace(/&quot;/gi, '"')
                  .replace(/&#39;/gi, "'")
                  .replace(/<[^>]+>/g, '')
                  .replace(/\u00A0/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()}
              </p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-400">{new Date(article.CreatedAt).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(article)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(article.ID)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No articles found</h2>
          <p className="text-slate-500 max-w-md mx-auto">You haven't written any articles yet. Create one to share news or tips on your public page.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Article' : 'Write New Article'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="articleForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Author</label>
                      <input 
                        type="text" 
                        value={formData.author} 
                        onChange={e => setFormData({...formData, author: e.target.value})} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g. M-GYM Team"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cover Image</label>
                    <div className="h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden group">
                      {formData.cover_url ? (
                        <>
                          <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-sm font-medium">Change Cover</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-slate-400 flex flex-col items-center">
                          <ImageIcon size={24} className="mb-2" />
                          <span className="text-sm">Upload Cover</span>
                        </div>
                      )}
                      <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
                  <div className="h-[400px] mb-12">
                    <ReactQuill 
                      theme="snow" 
                      value={formData.content} 
                      onChange={(content) => setFormData({...formData, content})} 
                      modules={modules}
                      formats={formats}
                      className="h-full bg-white rounded-xl"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" form="articleForm" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30">Publish Article</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
