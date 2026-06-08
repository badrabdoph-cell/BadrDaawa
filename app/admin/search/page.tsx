import Link from "next/link";
import { Archive, FileText, Search, Shapes, UserCheck, UsersRound } from "lucide-react";
import { getGlobalAdminSearchResults, type AdminSearchKind, type AdminSearchResult } from "@/lib/admin-search";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchPageParams = {
  q?: string;
};

const groupIcons: Record<AdminSearchKind, typeof Archive> = {
  invitations: Archive,
  customers: UsersRound,
  orders: FileText,
  guests: UserCheck,
  templates: Shapes,
};

function SearchResultItem({ result }: { result: AdminSearchResult }) {
  return (
    <Link className="global-search-result" href={result.href}>
      <strong>{result.title}</strong>
      <span>{result.subtitle}</span>
      {result.meta ? <small>{result.meta}</small> : null}
    </Link>
  );
}

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const search = await getGlobalAdminSearchResults(query);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Global Search</span>
          <h1>البحث العام</h1>
          <p>ابحث في الدعوات، العملاء، الطلبات، الحضور، والقوالب من مكان واحد.</p>
        </div>
      </div>

      <form className="global-search-hero" action="/admin/search" method="get">
        <label className="admin-search-field">
          <Search size={18} />
          <input name="q" placeholder="اكتب اسم، هاتف، كود دعوة، رقم طلب أو اسم قالب" defaultValue={query} autoFocus />
        </label>
        <button className="btn btn-gold" type="submit">
          <Search size={18} />
          بحث
        </button>
      </form>

      {query ? (
        <section className="admin-list-overview global-search-overview" aria-label="ملخص نتائج البحث">
          <div className="admin-list-stat good">
            <Search size={19} />
            <span>كل النتائج</span>
            <strong>{formatArabicNumber(search.total)}</strong>
          </div>
          {search.groups.map((group) => {
            const Icon = groupIcons[group.kind];
            return (
              <div className="admin-list-stat" key={group.kind}>
                <Icon size={19} />
                <span>{group.label}</span>
                <strong>{formatArabicNumber(group.total)}</strong>
              </div>
            );
          })}
        </section>
      ) : null}

      {!query ? (
        <div className="admin-empty-state compact">
          <strong>ابدأ البحث من الأعلى</strong>
          <p>يمكنك البحث باسم العريس أو العروس، رقم الهاتف، كود الدعوة، رقم الطلب، اسم الضيف أو اسم القالب.</p>
        </div>
      ) : search.total ? (
        <section className="global-search-groups" aria-label="نتائج البحث">
          {search.groups.map((group) => {
            const Icon = groupIcons[group.kind];
            return (
              <article className="panel global-search-group" key={group.kind}>
                <header>
                  <div>
                    <Icon size={22} />
                    <div>
                      <h2>{group.label}</h2>
                      <span>{formatArabicNumber(group.total)} نتيجة</span>
                    </div>
                  </div>
                  {group.total > group.results.length ? <small>عرض أول {formatArabicNumber(group.results.length)}</small> : null}
                </header>
                {group.results.length ? (
                  <div className="global-search-list">
                    {group.results.map((result) => (
                      <SearchResultItem result={result} key={`${group.kind}-${result.id}`} />
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-state compact">
                    <strong>لا توجد نتائج في هذا القسم</strong>
                    <p>جرّب كلمة أخرى أو ابحث برقم الهاتف أو الكود.</p>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <div className="admin-empty-state compact">
          <strong>لا توجد نتائج مطابقة</strong>
          <p>جرّب البحث بكود الدعوة، رقم الهاتف، اسم العميل أو اسم القالب.</p>
        </div>
      )}
    </>
  );
}
