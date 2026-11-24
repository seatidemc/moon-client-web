import {
  Button,
  Card,
  Checkbox,
  Description,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
  toast,
} from '@heroui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'

import { PendingButton } from '@/components/PendingButton'

import { adminApi } from '../api'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
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
        <Form onSubmit={handleSubmit} className="max-w-3xl">
          <Card>
            <Card.Content className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField fullWidth>
                  <Label>站点名称</Label>
                  <Input
                    value={form.siteName}
                    onChange={(event) => update('siteName', event.target.value)}
                  />
                </TextField>

                <TextField fullWidth>
                  <Label>站点描述</Label>
                  <Input
                    value={form.siteDescription}
                    onChange={(event) =>
                      update('siteDescription', event.target.value)
                    }
                  />
                </TextField>
              </div>

              <TextField fullWidth>
                <Label>公告</Label>
                <TextArea
                  rows={2}
                  value={form.announcement}
                  placeholder="留空则不显示公告"
                  onChange={(event) =>
                    update('announcement', event.target.value)
                  }
                />
              </TextField>

              <TextField fullWidth>
                <Label>页脚文字</Label>
                <Input
                  value={form.footerText}
                  onChange={(event) => update('footerText', event.target.value)}
                />
              </TextField>

              <TextField fullWidth>
                <Label>默认头像模板</Label>
                <Input
                  value={form.defaultAvatarUrlTemplate}
                  onChange={(event) =>
                    update('defaultAvatarUrlTemplate', event.target.value)
                  }
                />
                <Description>
                  支持 {'{username}'} 占位符；用户上传头像后优先使用上传头像。
                </Description>
              </TextField>

              <div className="space-y-2 border-t border-border pt-3">
                <Checkbox
                  isSelected={form.allowGuestRead}
                  onChange={(isSelected) =>
                    update('allowGuestRead', isSelected)
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Label>
                      允许游客阅读（关闭后公开读接口要求登录）
                    </Label>
                  </Checkbox.Content>
                </Checkbox>
                <Checkbox
                  isSelected={form.registrationEnabled}
                  onChange={(isSelected) =>
                    update('registrationEnabled', isSelected)
                  }
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Label>开放注册（预留项，当前版本不生效）</Label>
                  </Checkbox.Content>
                </Checkbox>
              </div>

              <div className="flex gap-2">
                <PendingButton
                  type="submit"
                  variant="primary"
                  isPending={saving}
                >
                  保存设置
                </PendingButton>
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
            </Card.Content>
          </Card>

          <Typography.Paragraph size="xs" color="muted" className="mt-3">
            未知设置键会被后端拒绝；设置更新写入审计日志。
          </Typography.Paragraph>
        </Form>
      )}
    </div>
  )
}