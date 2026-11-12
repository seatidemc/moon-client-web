import { Button, Tooltip } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { NewThreadDialog } from '@/components/NewThreadDialog';
import { UserAvatar } from '@/components/UserAvatar';
import { useForum } from '@/lib/forum-context';
import { formatRelativeTime, makeExcerpt } from '@/lib/utils';

const RECENT_REPLY_LIMIT = 5;
const RECENT_REPLY_EXCERPT_LENGTH = 40;

export function HomeSidebar() {
	const { users, threads, replies, currentUser, openLogin } = useForum();
	const [composerOpen, setComposerOpen] = useState(false);

	const recentReplies = [...replies]
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.flatMap(reply => {
			const thread = threads.find(item => item.id === reply.threadId);
			if (!thread) return [];

			return [
				{
					reply,
					thread,
					author: users.find(user => user.id === reply.authorId)
				}
			];
		})
		.slice(0, RECENT_REPLY_LIMIT);

	function openComposer() {
		if (!currentUser) {
			openLogin(() => setComposerOpen(true));
			return;
		}

		setComposerOpen(true);
	}

	return (
		<aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
			<div className="space-y-4">
				<Button
					type="button"
					size="md"
					variant="primary"
					className="w-full"
					onPress={openComposer}
				>
					<Plus className="size-4" />
					发布帖子
				</Button>

				<section aria-label="最近回复" className="rounded-2xl bg-surface p-4">
					<h2 className="text-sm font-medium">最近回复</h2>

					{recentReplies.length > 0 ? (
						<ul className="mt-1 divide-y divide-border">
							{recentReplies.map(({ reply, thread, author }) => {
								const excerpt = makeExcerpt(
									reply.content,
									RECENT_REPLY_EXCERPT_LENGTH
								);

								return (
									<li key={reply.id}>
										<Link
											to={`/thread/${thread.id}#reply-${reply.id}`}
											className="group block py-3 text-sm leading-6 text-muted"
										>
											{author ? (
												<Tooltip delay={0} closeDelay={0}>
													<Tooltip.Trigger
														className="relative top-[-1.5px] mr-2 inline-flex align-middle"
														render={props => <span {...props} />}
													>
														<UserAvatar user={author} className="size-6" />
													</Tooltip.Trigger>
													<Tooltip.Content>{author.name}</Tooltip.Content>
												</Tooltip>
											) : null}
											<span>{formatRelativeTime(reply.createdAt)}</span>
											<span className="ml-2 text-foreground">{excerpt}</span>
											<span className="mt-1 block text-xs">{thread.title}</span>
										</Link>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="mt-3 text-sm text-muted">还没有回复。</p>
					)}
				</section>
			</div>

			<NewThreadDialog isOpen={composerOpen} onOpenChange={setComposerOpen} />
		</aside>
	);
}
