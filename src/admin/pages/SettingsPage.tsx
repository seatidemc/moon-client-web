import { Button, TextArea, toast } from '@heroui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'

import { adminApi } from '../api'
import {
  Card,
  CheckboxInput,
  ErrorPanel,
  Field,
  LoadingPanel,
  PageHeader,
  TextInput,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import { adminKeys } from '../store'
import type { SiteSettings } from '../types'

const SETTING_KEYS = {
  siteName: 'site_name',
  siteDescription: 'site_description',
  announcement: 'announcement',
  footerText: 'footer_text',
  allowGuestRead: 'allow_guest_read',
  defaultAvatarUrlTemplate: 'default_avatar_url_template',
  registrationEnabled: 'registration_enabled',
} as const

interface SettingsForm {
  siteName: string
  siteDescription: string
  announcement: string
  footerText: string
  allowGuestRead: boolean
  defaultAvatarUrlTemplate: string
  registrationEnabled: boolean
}

function formFromSettings(settings: SiteSettings): SettingsForm {
  return {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    announcement: settings.announcement,
    footerText: settings.footerText,
    allowGuestRead: settings.allowGuestRead,
    defaultAvatarUrlTemplate: settings.defaultAvatarUrlTemplate,
    registrationEnabled: settings.registrationEnabled,
  }
}

export function SettingsPage() {
  useAdminPageTitle('站点设置')
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [saving, setSaving] = useState(false)

  const settingsQuery = useQuery({
    queryKey: adminKeys.settings,
    queryFn: adminApi.settings,
  })

  useEffect(() => {
    if (settingsQuery.data && !form) {
      setForm(formFromSettings(settingsQuery.data))
    }
  }, [form, settingsQuery.data])

  function update<K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || saving) return

    if (!form.siteName.trim()) {
      toast.danger('站点名称不能为空。')
      return
    }

    const updates: Record<string, string> = {
      [SETTING_KEYS.siteName]: form.siteName.trim(),
      [SETTING_KEYS.siteDescription]: form.siteDescription.trim(),
      [SETTING_KEYS.announcement]: form.announcement,
      [SETTING_KEYS.footerText]: form.footerText,
      [SETTING_KEYS.allowGuestRead]: String(form.allowGuestRead),
      [SETTING_KEYS.defaultAvatarUrlTemplate]:
        form.defaultAvatarUrlTemplate.trim(),
      [SETTING_KEYS.registrationEnabled]: String(form.registrationEnabled),
    }

    setSaving(true)
    try {
      const updated = await adminApi.updateSettings(updates)
      queryClient.setQueryData(adminKeys.settings, updated)
      setForm(formFromSettings(updated))
      toast.success('站点设置已保存')
    } catch (mutationError) {
      toast.danger(
        mutationError instanceof Error
          ? mutationError.message
          : '保存设置失败，请稍后再试。',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="站点设置"
        description="站点名称、公告、页脚与访问策略。保存后前台会读取最新值。"
      />

      {settingsQuery.isPending || !form ? (
        settingsQuery.isError ? (
          <ErrorPanel
            message={settingsQuery.error.message}
            onRetry={() => void settingsQuery.refetch()}
          />
        ) : (
          <LoadingPanel />
        )
      ) : (
        <form onSubmit={handleSubmit} className="max-w-3xl">
          <Card className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="站点名称" htmlFor="setting-site-name">
                <TextInput
                  id="setting-site-name"
                  value={form.siteName}
                  onChange={(event) => update('siteName', event.target.value)}
                />
              </Field>

              <Field label="站点描述" htmlFor="setting-description">
                <TextInput
                  id="setting-description"
                  value={form.siteDescription}
                  onChange={(event) =>
                    update('siteDescription', event.target.value)
                  }
                />
              </Field>
            </div>

            <Field label="公告" htmlFor="setting-announcement">
              <TextArea
                id="setting-announcement"
                fullWidth
                rows={2}
                value={form.announcement}
                placeholder="留空则不显示公告"
                onChange={(event) =>
                  update('announcement', event.target.value)
                }
              />
            </Field>

            <Field label="页脚文字" htmlFor="setting-footer">
              <TextInput
                id="setting-footer"
                value={form.footerText}
                onChange={(event) => update('footerText', event.target.value)}
              />
            </Field>

            <Field
              label="默认头像模板"
              htmlFor="setting-avatar"
              hint="支持 {username} 占位符；用户上传头像后优先使用上传头像。"
            >
              <TextInput
                id="setting-avatar"
                value={form.defaultAvatarUrlTemplate}
                onChange={(event) =>
                  update('defaultAvatarUrlTemplate', event.target.value)
                }
              />
            </Field>

            <div className="space-y-2 border-t border-border pt-3">
              <CheckboxInput
                label="允许游客阅读（关闭后公开读接口要求登录）"
                checked={form.allowGuestRead}
                onChange={(event) =>
                  update('allowGuestRead', event.target.checked)
                }
              />
              <CheckboxInput
                label="开放注册（预留项，当前版本不生效）"
                checked={form.registrationEnabled}
                onChange={(event) =>
                  update('registrationEnabled', event.target.checked)
                }
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" variant="primary" isDisabled={saving}>
                保存设置
              </Button>
              <Button
                variant="tertiary"
                onPress={() => {
                  if (settingsQuery.data) {
                    setForm(formFromSettings(settingsQuery.data))
                  }
                }}
              >
                还原
              </Button>
            </div>
          </Card>

          <p className="mt-3 text-xs text-muted">
            未知设置键会被后端拒绝；设置更新写入审计日志。
          </p>
        </form>
      )}
    </div>
  )
}