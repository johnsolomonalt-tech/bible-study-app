import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Fix imports
content = content.replace(
    "import { useAuth, UserButton, SignedIn, SignedOut, SignIn } from '@clerk/nextjs';",
    "import { useAuth, UserButton, SignIn } from '@clerk/nextjs';"
)

# Fix App function to use useAuth for conditional rendering
return_start = """  return (
    <>
      <SignedOut>
        <div className="h-screen w-full flex items-center justify-center bg-[#141413]">
          <SignIn routing="hash" />
        </div>
      </SignedOut>
      <SignedIn>
        <div className="h-full flex flex-col bg-[#141413] text-[#faf9f5]">"""

replacement_start = """  const { isLoaded, userId } = useAuth();
  
  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-[#141413] text-white">Loading...</div>;
  
  if (!userId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#141413]">
        <SignIn routing="hash" />
      </div>
    );
  }

  return (
    <>
        <div className="h-full flex flex-col bg-[#141413] text-[#faf9f5]">"""

content = content.replace(return_start, replacement_start)

# Fix the end tags
return_end = """        </div>
      </SignedIn>
    </>
  );
}"""

replacement_end = """        </div>
    </>
  );
}"""
content = content.replace(return_end, replacement_end)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
