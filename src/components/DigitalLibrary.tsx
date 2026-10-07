import React, { useMemo, useState } from 'react';
import {
  Search,
  Video,
  FileText,
  BookOpen,
  Newspaper,
  ExternalLink,
  X,
  Plus,
  Globe,
} from 'lucide-react';
import {
  DigitalResource,
  DigitalResourceType,
  MIT_DEPARTMENTS,
  UserRole,
} from '../types/database';

interface DigitalLibraryProps {
  activeRole: UserRole;
}

const STORAGE_DIGITAL_KEY = 'mit_lib_digital_resources_v1';

const INITIAL_DIGITAL_RESOURCES: DigitalResource[] = [
  // NPTEL VIDEO COURSES
  {
    id: 'dig-nptel-01',
    title: 'NPTEL: Programming, Data Structures and Algorithms using Python',
    author_or_source: 'Prof. Madhavan Mukund · CMI / IIT Madras (NPTEL)',
    type: 'NPTEL_VIDEO',
    department: 'Computer Science & Engineering',
    url: 'https://nptel.ac.in/courses/106106145',
    description:
      'Complete NPTEL video lecture series covering algorithmic analysis, recursion, sorting, graphs, and dynamic programming.',
    published_year: 2024,
  },
  {
    id: 'dig-nptel-02',
    title: 'NPTEL: Deep Learning & Neural Networks',
    author_or_source: 'Prof. Mitesh M. Khapra · IIT Madras (NPTEL)',
    type: 'NPTEL_VIDEO',
    department: 'Artificial Intelligence & Data Science',
    url: 'https://nptel.ac.in/courses/106106184',
    description:
      'Foundational and advanced lectures on backpropagation, CNNs, RNNs, attention mechanisms, and transformers.',
    published_year: 2024,
  },
  {
    id: 'dig-nptel-03',
    title: 'NPTEL: Human-Computer Interaction (HCI) & Design Thinking',
    author_or_source: 'Prof. Samit Bhattacharya · IIT Guwahati (NPTEL)',
    type: 'NPTEL_VIDEO',
    department: 'Computer Science & Design',
    url: 'https://nptel.ac.in/courses/106103115',
    description:
      'Interactive system design lifecycle, usability engineering, cognitive modeling, and interface prototyping.',
    published_year: 2023,
  },
  {
    id: 'dig-nptel-04',
    title: 'NPTEL: Fundamentals of Manufacturing Processes',
    author_or_source: 'Prof. D. K. Dwivedi · IIT Roorkee (NPTEL)',
    type: 'NPTEL_VIDEO',
    department: 'Mechanical Engineering',
    url: 'https://nptel.ac.in/courses/112107219',
    description:
      'Casting, metal forming, machining, joining processes, and modern CNC manufacturing systems.',
    published_year: 2023,
  },
  {
    id: 'dig-nptel-05',
    title: 'NPTEL: Structural Analysis - I',
    author_or_source: 'Prof. Amit Shaw · IIT Kharagpur (NPTEL)',
    type: 'NPTEL_VIDEO',
    department: 'Civil Engineering',
    url: 'https://nptel.ac.in/courses/105105166',
    description:
      'Analysis of determinate and indeterminate trusses, beams, arches, cables, and influence line diagrams.',
    published_year: 2023,
  },
  {
    id: 'dig-nptel-06',
    title: 'NPTEL: Power Electronics & Drives',
    author_or_source: 'Prof. G. Bhuvaneswari · IIT Delhi (NPTEL)',
    type: 'NPTEL_VIDEO',
    department: 'Electrical & Electronics Engineering',
    url: 'https://nptel.ac.in/courses/108102145',
    description:
      'Power semiconductor switches, AC-DC rectifiers, DC-DC choppers, and PWM inverters.',
    published_year: 2023,
  },

  // RESEARCH PAPERS (ARXIV / OPEN ACCESS)
  {
    id: 'dig-paper-01',
    title: 'Attention Is All You Need (Transformer Architecture Paper)',
    author_or_source: 'Vaswani et al. · arXiv:1706.03762 [cs.CL]',
    type: 'RESEARCH_PAPER',
    department: 'Artificial Intelligence & Data Science',
    url: 'https://arxiv.org/pdf/1706.03762.pdf',
    description:
      'Seminal open-access research paper introducing the self-attention Transformer architecture for sequence modeling.',
    published_year: 2023,
  },
  {
    id: 'dig-paper-02',
    title: 'Deep Residual Learning for Image Recognition (ResNet)',
    author_or_source: 'Kaiming He et al. · arXiv:1512.03385 [cs.CV]',
    type: 'RESEARCH_PAPER',
    department: 'Computer Science & Engineering',
    url: 'https://arxiv.org/pdf/1512.03385.pdf',
    description:
      'Foundational computer vision research paper presenting residual learning frameworks for training deep networks.',
    published_year: 2022,
  },

  // OPEN-ACCESS BOOK PDFs
  {
    id: 'dig-book-01',
    title: 'Mathematics for Machine Learning (Complete Textbook PDF)',
    author_or_source: 'Marc Peter Deisenroth, A. Aldo Faisal, Cheng Soon Ong · Cambridge University Press',
    type: 'BOOK_PDF',
    department: 'Artificial Intelligence & Data Science',
    url: 'https://mml-book.github.io/book/mml-book.pdf',
    description:
      'Full open-access textbook PDF covering linear algebra, analytic geometry, matrix decompositions, vector calculus, and optimization.',
    published_year: 2023,
  },
  {
    id: 'dig-book-02',
    title: 'Introduction to Probability, Statistics, and Random Processes',
    author_or_source: 'Hossein Pishro-Nik · Open Textbook Repository',
    type: 'BOOK_PDF',
    department: 'Basic Sciences & Humanities',
    url: 'https://www.probabilitycourse.com/',
    description:
      'Comprehensive engineering probability and stochastic processes digital textbook with solved examples.',
    published_year: 2023,
  },
  {
    id: 'dig-book-03',
    title: 'Pro Git (2nd Edition Official Open eBook PDF)',
    author_or_source: 'Scott Chacon & Ben Straub · Apress Open',
    type: 'BOOK_PDF',
    department: 'Computer Science & Design',
    url: 'https://git-scm.com/book/en/v2',
    description:
      'Complete handbook on version control systems, branching workflows, distributed repositories, and Git internals.',
    published_year: 2024,
  },

  // ARTICLES & ACADEMIC JOURNALS
  {
    id: 'dig-jour-01',
    title: 'National Digital Library of India (NDLI — IIT Kharagpur)',
    author_or_source: 'Ministry of Education, Govt. of India',
    type: 'JOURNAL_ARTICLE',
    department: 'Computer Science & Engineering',
    url: 'https://ndl.iitkgp.ac.in/',
    description:
      'Access millions of Indian academic theses, Shodhganga research articles, NPTEL notes, and institutional journals.',
    published_year: 2025,
  },
  {
    id: 'dig-jour-02',
    title: 'DOAJ — Directory of Open Access Engineering Journals',
    author_or_source: 'DOAJ Peer-Reviewed Journal Index',
    type: 'JOURNAL_ARTICLE',
    department: 'Mechanical Engineering',
    url: 'https://doaj.org/',
    description:
      'Peer-reviewed open-access scientific and engineering journals across civil, mechanical, electrical, and computer sciences.',
    published_year: 2025,
  },
  {
    id: 'dig-jour-03',
    title: 'IEEE Xplore Open Access Articles & Standards Portal',
    author_or_source: 'Institute of Electrical and Electronics Engineers (IEEE)',
    type: 'JOURNAL_ARTICLE',
    department: 'Electrical & Electronics Engineering',
    url: 'https://ieeexplore.ieee.org/Xplorehome.jsp',
    description:
      'Technical literature in engineering, electronics, power systems, and computer science journals.',
    published_year: 2025,
  },
];

const TYPE_META: Record<
  DigitalResourceType,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    ctaLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  NPTEL_VIDEO: {
    label: 'NPTEL Video Course',
    badgeBg: 'bg-[#F0F9FF]',
    badgeText: 'text-[#0284C7]',
    badgeBorder: 'border-[#E0F2FE]',
    ctaLabel: 'Watch NPTEL Course',
    icon: Video,
  },
  RESEARCH_PAPER: {
    label: 'Research Paper',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200',
    ctaLabel: 'Read Research Paper (PDF)',
    icon: FileText,
  },
  BOOK_PDF: {
    label: 'Book PDF / eBook',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-[#059669]',
    badgeBorder: 'border-emerald-200',
    ctaLabel: 'Open Book / PDF',
    icon: BookOpen,
  },
  JOURNAL_ARTICLE: {
    label: 'Journal & Article Portal',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-[#D97706]',
    badgeBorder: 'border-amber-200',
    ctaLabel: 'Explore Journal / Article',
    icon: Newspaper,
  },
};

export const DigitalLibrary: React.FC<DigitalLibraryProps> = ({ activeRole }) => {
  const [resources, setResources] = useState<DigitalResource[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DIGITAL_KEY);
      if (saved) return JSON.parse(saved) as DigitalResource[];
    } catch {
      // Ignore storage error
    }
    return INITIAL_DIGITAL_RESOURCES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DigitalResourceType | 'ALL'>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Add Digital Resource Modal for Librarian / Admin
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newType, setNewType] = useState<DigitalResourceType>('NPTEL_VIDEO');
  const [newDept, setNewDept] = useState<string>('Computer Science & Engineering');
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((item) => {
      if (selectedType !== 'ALL' && item.type !== selectedType) return false;
      if (selectedDept !== 'ALL' && item.department !== selectedDept) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.author_or_source.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [resources, searchQuery, selectedType, selectedDept]);

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    const created: DigitalResource = {
      id: `dig-${Date.now()}`,
      title: newTitle.trim(),
      author_or_source: newAuthor.trim() || 'MIT Digital Repository',
      type: newType,
      department: newDept,
      url: newUrl.trim(),
      description: newDesc.trim() || 'Academic digital learning resource.',
      published_year: new Date().getFullYear(),
    };

    const updated = [created, ...resources];
    setResources(updated);
    try {
      localStorage.setItem(STORAGE_DIGITAL_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }

    setNewTitle('');
    setNewAuthor('');
    setNewUrl('');
    setNewDesc('');
    setAddModalOpen(false);
  };

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#F8FAFC] border border-[#E0F2FE] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0284C7]">
              <Globe className="w-4 h-4" />
              <span>Open-Access Academic e-Library</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5">
              MIT Digital Library — NPTEL Videos, Research Papers, Journals & Book PDFs
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Direct verified links to IIT/IISc NPTEL video courses, peer-reviewed journals, arXiv research papers, and open-access engineering textbooks.
            </p>
          </div>

          {(activeRole === 'LIBRARIAN' || activeRole === 'ADMIN') && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Digital Link / PDF
            </button>
          )}
        </div>

        {/* Filter Tabs + Search Row */}
        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Interactive Type Segmented Filter */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-xl border border-[#E0F2FE]">
            {(
              [
                { id: 'ALL', label: 'All Resources' },
                { id: 'NPTEL_VIDEO', label: 'NPTEL Videos' },
                { id: 'BOOK_PDF', label: 'Book PDFs' },
                { id: 'RESEARCH_PAPER', label: 'Research Papers' },
                { id: 'JOURNAL_ARTICLE', label: 'Journals & Articles' },
              ] as { id: DigitalResourceType | 'ALL'; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedType === tab.id
                    ? 'bg-[#0284C7] text-white'
                    : 'text-slate-600 hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Department Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#0284C7] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search NPTEL course, paper title, author, or topic..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#E0F2FE] rounded-xl text-xs text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-white border border-[#E0F2FE] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">All Departments</option>
              {MIT_DEPARTMENTS.filter(
                (d) => d !== 'Library & Administration' && d !== 'Other'
              ).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Digital Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResources.map((item) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;

          return (
            <article
              key={item.id}
              className="bg-white border border-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-between hover:border-sky-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {item.published_year}
                  </span>
                </div>

                <h2 className="text-base font-bold text-[#0F172A] leading-snug">
                  {item.title}
                </h2>
                <p className="text-xs font-medium text-[#0284C7] mt-1">
                  {item.author_or_source}
                </p>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-sky-50 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 truncate">
                  {item.department}
                </span>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0F9FF] hover:bg-[#0284C7] text-[#0284C7] hover:text-white border border-[#E0F2FE] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{meta.ctaLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {/* Add Digital Resource Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden">
            <div className="bg-[#F0F9FF] border-b border-[#E0F2FE] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Add Digital Library Resource
                </h3>
                <p className="text-xs text-slate-600">
                  Publish an NPTEL course link, research paper, journal, or book PDF
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddResource} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Resource Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as DigitalResourceType)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A]"
                  >
                    <option value="NPTEL_VIDEO">NPTEL Video Course</option>
                    <option value="BOOK_PDF">Book PDF / eBook</option>
                    <option value="RESEARCH_PAPER">Research Paper</option>
                    <option value="JOURNAL_ARTICLE">Journal / Article</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A]"
                  >
                    {MIT_DEPARTMENTS.filter((d) => d !== 'Library & Administration').map(
                      (dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., NPTEL: Compiler Design"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Author / Institution / Journal Name
                </label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g., Prof. Santanu Chattopadhyay · IIT Kharagpur"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Direct URL (NPTEL / PDF / DOI Link)
                </label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://nptel.ac.in/courses/..."
                  className="w-full px-3.5 py-2 text-sm font-mono bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Brief Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Topics covered by this video series, paper, or textbook..."
                  className="w-full px-3.5 py-2 text-xs bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl text-[#0F172A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Publish Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
