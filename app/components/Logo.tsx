import Image from 'next/image';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizeConfig = {
    xs: { width: 60, height: 24 },
    sm: { width: 80, height: 32 },
    md: { width: 120, height: 48 },
    lg: { width: 160, height: 64 }
  };

  const { width, height } = sizeConfig[size];

  return (
    <div className="flex justify-center">
      <Image
        src="/icons/logo.png"  // ou .svg
        alt="Logo da empresa"
        width={width}
        height={height}
        priority
      />
    </div>
  );
} 