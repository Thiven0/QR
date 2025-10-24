import ProfileCard from '../../../shared/components/ProfileCard';
import useAuth from '../../auth/hooks/useAuth';

const ProfileUser = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-[#0f172a] text-center">Mi cuenta</h1>
        <p className="mt-2 text-center text-sm text-[#475569]">
          Revisa y confirma tu informacion personal registrada en el sistema.
        </p>

        <div className="mt-8 flex justify-center">
          <ProfileCard user={user} variant="expanded" />
        </div>
      </div>
    </div>
  );
};

export default ProfileUser;
