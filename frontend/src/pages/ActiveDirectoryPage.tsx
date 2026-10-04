import ActiveDirectorySettings from '../components/ActiveDirectorySettings'

type ActiveDirectoryPageProps = {
  showToast: (msg: string) => void
}

export default function ActiveDirectoryPage({ showToast }: ActiveDirectoryPageProps) {
  const token = localStorage.getItem('access_token') || ''

  return (
    <section id="view-ad">
      <ActiveDirectorySettings token={token} showToast={showToast} />
    </section>
  )
}
