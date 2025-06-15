
import PasswordForm from "@/components/profile/PasswordForm";
import ProfileForm from "@/components/profile/ProfileForm";

export default function ProfilePage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold md:text-3xl">Profile & Settings</h1>
            <div className="grid gap-6 lg:grid-cols-1">
                <ProfileForm />
                <PasswordForm />
            </div>
        </div>
    );
}
